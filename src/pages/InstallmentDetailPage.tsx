import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useInstallment, addInstallmentPayment, reverseInstallment } from '../hooks/useInstallments';
import { formatCurrency, formatDate } from '../lib/utils';
import { ArrowLeft, Plus, XCircle } from 'lucide-react';

export default function InstallmentDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { installment, loading, error, refetch } = useInstallment(id || null);

  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [showReverseModal, setShowReverseModal] = useState(false);
  const [paymentData, setPaymentData] = useState({
    payment_date: formatDate(new Date()),
    amount: '',
    payment_method: '',
    receipt_number: '',
    notes: '',
  });
  const [reversalReason, setReversalReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!installment) return;

    setModalError(null);
    setSubmitting(true);

    try {
      if (!paymentData.amount || parseFloat(paymentData.amount) <= 0) {
        throw new Error('Payment amount must be greater than 0');
      }

      // Convert date from DD/MM/YYYY to YYYY-MM-DD for database
      const [day, month, year] = paymentData.payment_date.split('/');
      const isoDate = `${year}-${month}-${day}`;

      await addInstallmentPayment(
        installment.id,
        isoDate,
        parseFloat(paymentData.amount),
        paymentData.payment_method || undefined,
        paymentData.receipt_number || undefined,
        paymentData.notes || undefined
      );

      setShowAddPaymentModal(false);
      setPaymentData({
        payment_date: formatDate(new Date()),
        amount: '',
        payment_method: '',
        receipt_number: '',
        notes: '',
      });
      refetch();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Failed to add payment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReverse = async () => {
    if (!installment || !reversalReason.trim()) return;

    setModalError(null);
    setSubmitting(true);

    try {
      await reverseInstallment(installment.id, reversalReason);
      setShowReverseModal(false);
      setReversalReason('');
      refetch();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Failed to reverse installment');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <p className="mt-2 text-sm text-gray-500">Loading installment...</p>
        </div>
      </div>
    );
  }

  if (error || !installment) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/app/installments')}
            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{error || 'Installment not found'}</p>
        </div>
      </div>
    );
  }

  const progressPercentage = (installment.paid_amount / installment.total_amount) * 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/app/installments')}
            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{installment.person_name}</h1>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  installment.installment_type === 'taken'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-green-100 text-green-700'
                }`}
              >
                {installment.installment_type === 'taken' ? 'Taken' : 'Given'}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  installment.status === 'active'
                    ? 'bg-blue-100 text-blue-700'
                    : installment.status === 'reversed'
                    ? 'bg-gray-100 text-gray-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {installment.status}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Started: {formatDate(new Date(installment.start_date))}
              {installment.person_phone && ` • ${installment.person_phone}`}
            </p>
          </div>
        </div>
        {installment.status === 'active' && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowAddPaymentModal(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              <Plus className="h-4 w-4" />
              Add Payment
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

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Total Amount</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(installment.total_amount)}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">
            {installment.installment_type === 'taken' ? 'Paid' : 'Received'}
          </p>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(installment.paid_amount)}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Remaining</p>
          <p className="text-2xl font-bold text-blue-600">
            {formatCurrency(installment.remaining_amount)}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium text-gray-700">Progress</p>
          <p className="text-sm font-semibold text-gray-900">
            {progressPercentage.toFixed(1)}%
          </p>
        </div>
        <div className="h-4 overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full bg-green-500 transition-all"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
      </div>

      {/* Details */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Details</h2>
        <div className="space-y-3">
          {installment.description && (
            <div>
              <p className="text-sm text-gray-500">Description</p>
              <p className="text-base text-gray-900">{installment.description}</p>
            </div>
          )}
          {installment.notes && (
            <div>
              <p className="text-sm text-gray-500">Notes</p>
              <p className="text-base text-gray-900 whitespace-pre-wrap">{installment.notes}</p>
            </div>
          )}
          {installment.reversal_reason && (
            <div>
              <p className="text-sm text-gray-500">Reversal Reason</p>
              <p className="text-base text-gray-900">{installment.reversal_reason}</p>
              {installment.reversed_at && (
                <p className="mt-1 text-xs text-gray-500">
                  Reversed on {formatDate(new Date(installment.reversed_at))}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Payment History */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Payment History</h2>
        {installment.payments && installment.payments.length > 0 ? (
          <div className="space-y-3">
            {installment.payments.map((payment) => (
              <div
                key={payment.id}
                className="rounded-lg border border-gray-200 bg-gray-50 p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900">
                        {formatCurrency(payment.amount)}
                      </p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          payment.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {payment.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      {formatDate(new Date(payment.payment_date))}
                    </p>
                    {payment.payment_method && (
                      <p className="mt-1 text-xs text-gray-500">
                        Method: {payment.payment_method}
                      </p>
                    )}
                    {payment.receipt_number && (
                      <p className="text-xs text-gray-500">
                        Receipt: {payment.receipt_number}
                      </p>
                    )}
                    {payment.notes && (
                      <p className="mt-1 text-sm text-gray-600">{payment.notes}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-sm text-gray-500">No payments recorded yet</p>
        )}
      </div>

      {/* Add Payment Modal */}
      {showAddPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <h2 className="text-xl font-bold text-gray-900">Add Payment</h2>
            <form onSubmit={handleAddPayment} className="mt-4 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Payment Date *
                </label>
                <input
                  type="text"
                  value={paymentData.payment_date}
                  onChange={(e) => setPaymentData({ ...paymentData, payment_date: e.target.value })}
                  placeholder="DD/MM/YYYY"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Amount (Rs.) *
                </label>
                <input
                  type="number"
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Payment Method
                </label>
                <input
                  type="text"
                  value={paymentData.payment_method}
                  onChange={(e) => setPaymentData({ ...paymentData, payment_method: e.target.value })}
                  placeholder="e.g., Cash, Bank Transfer"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Receipt Number
                </label>
                <input
                  type="text"
                  value={paymentData.receipt_number}
                  onChange={(e) => setPaymentData({ ...paymentData, receipt_number: e.target.value })}
                  placeholder="Receipt or reference number"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Notes
                </label>
                <textarea
                  value={paymentData.notes}
                  onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                  placeholder="Additional notes"
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {modalError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                  <p className="text-sm text-red-800">{modalError}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddPaymentModal(false);
                    setModalError(null);
                  }}
                  className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {submitting ? 'Adding...' : 'Add Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reverse Modal */}
      {showReverseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <h2 className="text-xl font-bold text-gray-900">Reverse Installment</h2>
            <p className="mt-2 text-sm text-gray-600">
              This will mark the installment as reversed and exclude it from calculations.
              This action cannot be undone.
            </p>

            <div className="mt-4">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Reason for Reversal *
              </label>
              <textarea
                value={reversalReason}
                onChange={(e) => setReversalReason(e.target.value)}
                placeholder="Enter reason for reversing this installment"
                rows={4}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {modalError && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-sm text-red-800">{modalError}</p>
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setShowReverseModal(false);
                  setReversalReason('');
                  setModalError(null);
                }}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReverse}
                disabled={!reversalReason.trim() || submitting}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {submitting ? 'Reversing...' : 'Reverse Installment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
