import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePersonalExpense } from '../hooks/usePersonalExpenses';
import { softDeleteRecord, getErrorMessage } from '../hooks/useDeletion';
import { formatCurrency, formatDate } from '../lib/utils';
import { ArrowLeft, Edit2, XCircle } from 'lucide-react';

export default function PersonalExpenseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { expense, loading, error } = usePersonalExpense(id || null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletionReason, setDeletionReason] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!id || !deletionReason.trim()) return;

    setDeleting(true);
    setDeleteError(null);
    try {
      // Soft delete via secure RPC — record moves to the Deleted Data
      // (recycle bin) and can be restored later with its previous status.
      // Personal expenses are also the only entity an OWNER can
      // permanently delete from Account → Deleted Data.
      await softDeleteRecord('personal_expenses', id, deletionReason);
      setShowDeleteModal(false);
      setDeletionReason('');
      navigate('/app/expenses');
    } catch (err) {
      setDeleteError(getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <p className="mt-2 text-sm text-gray-500">Loading expense...</p>
        </div>
      </div>
    );
  }

  if (error || !expense) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/app/expenses')}
            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{error || 'Expense not found'}</p>
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
            onClick={() => navigate('/app/expenses')}
            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{expense.category}</h1>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  expense.status === 'active'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {expense.status}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              {formatDate(new Date(expense.expense_date))}
            </p>
          </div>
        </div>
        {expense.status === 'active' && (
          <div className="flex gap-2">
            <button
              onClick={() => navigate(`/app/expenses/${id}/edit`)}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Edit2 className="h-4 w-4" />
              Edit
            </button>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              <XCircle className="h-4 w-4" />
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Main Details */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="space-y-6">
          {/* Amount */}
          <div className="border-b border-gray-200 pb-4">
            <p className="text-sm text-gray-500">Amount</p>
            <p className="text-3xl font-bold text-amber-600">
              {formatCurrency(expense.amount)}
            </p>
          </div>

          {/* Details Grid */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-gray-500">Category</p>
              <p className="text-base font-medium text-gray-900">{expense.category}</p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Date</p>
              <p className="text-base font-medium text-gray-900">
                {formatDate(new Date(expense.expense_date))}
              </p>
            </div>

            {expense.paid_by && (
              <div>
                <p className="text-sm text-gray-500">Paid By</p>
                <p className="text-base font-medium text-gray-900">{expense.paid_by}</p>
              </div>
            )}
          </div>

          {/* Description */}
          {expense.description && (
            <div>
              <p className="text-sm text-gray-500">Description</p>
              <p className="mt-2 text-base text-gray-900 whitespace-pre-wrap">
                {expense.description}
              </p>
            </div>
          )}

          {/* Notes */}
          {expense.notes && (
            <div className="border-t border-gray-200 pt-4">
              <p className="text-sm text-gray-500">Notes</p>
              <p className="mt-2 text-base text-gray-900 whitespace-pre-wrap">
                {expense.notes}
              </p>
            </div>
          )}

          {/* Reversal Info */}
          {expense.status === 'reversed' && (
            <div className="border-t border-gray-200 pt-4">
              <p className="text-sm font-medium text-gray-700">Reversal Information</p>
              <div className="mt-2 space-y-1 text-sm text-gray-600">
                {expense.reversal_reason && (
                  <p>
                    <span className="font-medium">Reason:</span> {expense.reversal_reason}
                  </p>
                )}
                {expense.reversed_at && (
                  <p>
                    <span className="font-medium">Reversed at:</span>{' '}
                    {formatDate(new Date(expense.reversed_at))}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Modal (soft delete -> recycle bin) */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <h2 className="text-xl font-bold text-gray-900">Delete Expense</h2>
            <p className="mt-2 text-sm text-gray-600">
              This will move the expense to Deleted Data (the recycle bin).
              It will stop appearing in lists and calculations, but it is NOT destroyed —
              it can be restored later from Account → Deleted Data.
              As an OWNER, you may permanently delete it from there if required.
            </p>

            <div className="mt-4">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Reason for Deletion *
              </label>
              <textarea
                value={deletionReason}
                onChange={(e) => setDeletionReason(e.target.value)}
                placeholder="Enter reason for deleting this expense"
                rows={4}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {deleteError && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-sm text-red-800">{deleteError}</p>
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletionReason('');
                  setDeleteError(null);
                }}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={!deletionReason.trim() || deleting}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete Expense'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
