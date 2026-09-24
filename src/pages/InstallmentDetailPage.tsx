import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useInstallment, addInstallmentPayment, updateInstallment, updateInstallmentPayment, deleteInstallmentPayment } from '../hooks/useInstallments';
import { softDeleteRecord, getErrorMessage } from '../hooks/useDeletion';
import { formatCurrency, formatDate } from '../lib/utils';
import type { InstallmentPayment } from '../types/database';
import { ArrowLeft, Edit2, Plus, Trash2 } from 'lucide-react';

interface PaymentFormData {
  payment_date: string;
  amount: string;
  payment_method: string;
  receipt_number: string;
  notes: string;
}

const emptyPaymentForm = (): PaymentFormData => ({
  payment_date: formatDate(new Date()),
  amount: '',
  payment_method: '',
  receipt_number: '',
  notes: '',
});

// Convert a DB date (YYYY-MM-DD) to the UI's DD/MM/YYYY display format.
const dbDateToUi = (iso: string): string => {
  const [y, m, d] = iso.split('-');
  return y && m && d ? `${d}/${m}/${y}` : iso;
};

export default function InstallmentDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { installment, loading, error, refetch } = useInstallment(id || null);

  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState({ person_name: '', person_phone: '', description: '', notes: '' });
  const [paymentData, setPaymentData] = useState<PaymentFormData>(emptyPaymentForm());
  const [deletionReason, setDeletionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Payment edit / delete state
  const [editingPayment, setEditingPayment] = useState<InstallmentPayment | null>(null);
  const [editPaymentData, setEditPaymentData] = useState<PaymentFormData>(emptyPaymentForm());
  const [deletingPayment, setDeletingPayment] = useState<InstallmentPayment | null>(null);
  const [paymentDeletionReason, setPaymentDeletionReason] = useState('');

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
      setPaymentData(emptyPaymentForm());
      refetch();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Failed to add payment');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditPaymentModal = (payment: InstallmentPayment) => {
    setEditingPayment(payment);
    setEditPaymentData({
      payment_date: dbDateToUi(payment.payment_date),
      amount: String(payment.amount),
      payment_method: payment.payment_method ?? '',
      receipt_number: payment.receipt_number ?? '',
      notes: payment.notes ?? '',
    });
    setModalError(null);
  };

  const handleSavePaymentEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayment) return;

    setModalError(null);
    setSubmitting(true);

    try {
      if (!editPaymentData.amount || parseFloat(editPaymentData.amount) <= 0) {
        throw new Error('Payment amount must be greater than 0');
      }

      // Convert date from DD/MM/YYYY to YYYY-MM-DD for database
      const [day, month, year] = editPaymentData.payment_date.split('/');
      const isoDate = `${year}-${month}-${day}`;

      // Updates the EXISTING payment in place (never creates a new one).
      // The hook recalculates the parent installment totals afterwards.
      await updateInstallmentPayment(editingPayment.id, {
        payment_date: isoDate,
        amount: parseFloat(editPaymentData.amount),
        payment_method: (editPaymentData.payment_method || null) as InstallmentPayment['payment_method'],
        receipt_number: editPaymentData.receipt_number || null,
        notes: editPaymentData.notes || null,
      });

      setEditingPayment(null);
      refetch();
    } catch (err) {
      setModalError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePayment = async () => {
    if (!deletingPayment || !paymentDeletionReason.trim()) return;

    setModalError(null);
    setSubmitting(true);

    try {
      // Soft delete via the secure recycle-bin RPC — the payment moves to
      // Deleted Data and can be restored. It is NEVER physically deleted,
      // and it stops counting toward the installment's paid total.
      await deleteInstallmentPayment(deletingPayment.id, paymentDeletionReason.trim());
      setDeletingPayment(null);
      setPaymentDeletionReason('');
      refetch();
    } catch (err) {
      setModalError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = () => {
    if (!installment) return;
    setEditData({
      person_name: installment.person_name ?? '',
      person_phone: installment.person_phone ?? '',
      description: installment.description ?? '',
      notes: installment.notes ?? '',
    });
    setModalError(null);
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!installment) return;

    setModalError(null);
    setSubmitting(true);

    try {
      if (!editData.person_name.trim()) {
        throw new Error('Please enter person name');
      }
      // Reuses the existing updateInstallment hook. Only descriptive
      // fields are editable — amounts/payments have their own workflow.
      await updateInstallment(installment.id, {
        person_name: editData.person_name.trim(),
        person_phone: editData.person_phone.trim() || undefined,
        description: editData.description.trim() || undefined,
        notes: editData.notes.trim() || undefined,
      } as Parameters<typeof updateInstallment>[1]);
      setShowEditModal(false);
      refetch();
    } catch (err) {
      setModalError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!installment || !deletionReason.trim()) return;

    setModalError(null);
    setSubmitting(true);

    try {
      // Soft delete via secure RPC — record moves to the Deleted Data
      // recycle bin and can be restored. The server rejects deletion while
      // active payments exist on this installment.
      await softDeleteRecord('installments', installment.id, deletionReason);
      setShowDeleteModal(false);
      setDeletionReason('');
      navigate('/app/installments');
    } catch (err) {
      setModalError(getErrorMessage(err));
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
        <div className="flex gap-2">
          {installment.status === 'active' && (
            <>
              <button
                onClick={() => setShowAddPaymentModal(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
              >
                <Plus className="h-4 w-4" />
                Add Payment
              </button>
              <button
                onClick={openEditModal}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <Edit2 className="h-4 w-4" />
                Edit
              </button>
            </>
          )}
          <button
            onClick={() => setShowDeleteModal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
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
                  {/* Active payments can be corrected or moved to the recycle bin */}
                  {payment.status === 'active' && !payment.deleted_at && (
                    <div className="ml-2 flex shrink-0 items-center gap-1">
                      <button
                        onClick={() => openEditPaymentModal(payment)}
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          setDeletingPayment(payment);
                          setPaymentDeletionReason('');
                          setModalError(null);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>
                  )}
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

      {/* Edit Modal (reuses updateInstallment hook; descriptive fields only) */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <h2 className="text-xl font-bold text-gray-900">Edit Installment</h2>
            <p className="mt-1 text-sm text-gray-500">
              Amounts and payments are managed through the payment workflow and cannot be edited here.
            </p>
            <form onSubmit={handleSaveEdit} className="mt-4 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Person Name *
                </label>
                <input
                  type="text"
                  value={editData.person_name}
                  onChange={(e) => setEditData({ ...editData, person_name: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Person Phone
                </label>
                <input
                  type="text"
                  value={editData.person_phone}
                  onChange={(e) => setEditData({ ...editData, person_phone: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  value={editData.description}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Notes
                </label>
                <textarea
                  value={editData.notes}
                  onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
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
                    setShowEditModal(false);
                    setModalError(null);
                  }}
                  className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal (soft delete -> recycle bin) */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <h2 className="text-xl font-bold text-gray-900">Delete Installment</h2>
            <p className="mt-2 text-sm text-gray-600">
              This will move the installment to the Deleted Data (recycle bin), where it can be
              restored later. It will stop appearing in lists and reports until restored.
              Deletion is rejected while active payments exist on this installment.
            </p>

            <div className="mt-4">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Reason for Deletion *
              </label>
              <textarea
                value={deletionReason}
                onChange={(e) => setDeletionReason(e.target.value)}
                placeholder="Enter reason for deleting this installment"
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
                  setShowDeleteModal(false);
                  setDeletionReason('');
                  setModalError(null);
                }}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={!deletionReason.trim() || submitting}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {submitting ? 'Deleting...' : 'Delete Installment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Payment Modal (reuses Add Payment form structure; updates in place) */}
      {editingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <h2 className="text-xl font-bold text-gray-900">Edit Payment</h2>
            <p className="mt-1 text-sm text-gray-500">
              Corrects the existing payment — the installment totals recalculate automatically.
            </p>
            <form onSubmit={handleSavePaymentEdit} className="mt-4 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Payment Date *
                </label>
                <input
                  type="text"
                  value={editPaymentData.payment_date}
                  onChange={(e) => setEditPaymentData({ ...editPaymentData, payment_date: e.target.value })}
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
                  value={editPaymentData.amount}
                  onChange={(e) => setEditPaymentData({ ...editPaymentData, amount: e.target.value })}
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
                  value={editPaymentData.payment_method}
                  onChange={(e) => setEditPaymentData({ ...editPaymentData, payment_method: e.target.value })}
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
                  value={editPaymentData.receipt_number}
                  onChange={(e) => setEditPaymentData({ ...editPaymentData, receipt_number: e.target.value })}
                  placeholder="Receipt or reference number"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Notes
                </label>
                <textarea
                  value={editPaymentData.notes}
                  onChange={(e) => setEditPaymentData({ ...editPaymentData, notes: e.target.value })}
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
                    setEditingPayment(null);
                    setModalError(null);
                  }}
                  className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Payment Modal (soft delete -> recycle bin) */}
      {deletingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <h2 className="text-xl font-bold text-gray-900">Delete Payment</h2>
            <p className="mt-2 text-sm text-gray-600">
              This will move the {formatCurrency(deletingPayment.amount)} payment dated{' '}
              {formatDate(new Date(deletingPayment.payment_date))} to the Deleted Data
              (recycle bin), where it can be restored later. It will no longer count toward
              this installment's paid total. The payment record is not permanently erased.
            </p>

            <div className="mt-4">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Reason for Deletion *
              </label>
              <textarea
                value={paymentDeletionReason}
                onChange={(e) => setPaymentDeletionReason(e.target.value)}
                placeholder="Enter reason for deleting this payment"
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
                  setDeletingPayment(null);
                  setPaymentDeletionReason('');
                  setModalError(null);
                }}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeletePayment}
                disabled={!paymentDeletionReason.trim() || submitting}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {submitting ? 'Deleting...' : 'Delete Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
