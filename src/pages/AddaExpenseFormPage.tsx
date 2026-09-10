import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createAddaExpense } from '../hooks/useAddaExpenses';
import { formatDate } from '../lib/utils';
import { ArrowLeft } from 'lucide-react';

export default function AddaExpenseFormPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    expense_date: formatDate(new Date()),
    expense_type: '',
    amount: '',
    description: '',
    paid_to: '',
    receipt_number: '',
    notes: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!formData.expense_type.trim()) {
        throw new Error('Please enter expense type');
      }
      if (!formData.amount || parseFloat(formData.amount) <= 0) {
        throw new Error('Amount must be greater than 0');
      }

      // Convert date from DD/MM/YYYY to YYYY-MM-DD for database
      const [day, month, year] = formData.expense_date.split('/');
      const isoDate = `${year}-${month}-${day}`;

      await createAddaExpense({
        expense_date: isoDate,
        expense_type: formData.expense_type.trim(),
        amount: parseFloat(formData.amount),
        description: formData.description.trim() || undefined,
        paid_to: formData.paid_to.trim() || undefined,
        receipt_number: formData.receipt_number.trim() || undefined,
        notes: formData.notes.trim() || undefined,
      });

      navigate('/app/adda');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create expense record');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/app/adda')}
          className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Adda Expense</h1>
          <p className="mt-1 text-sm text-gray-500">Record a new adda expense</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="space-y-4">
            {/* Expense Date */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Expense Date *
              </label>
              <input
                type="text"
                value={formData.expense_date}
                onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                placeholder="DD/MM/YYYY"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                required
              />
              <p className="mt-1 text-xs text-gray-500">Format: DD/MM/YYYY</p>
            </div>

            {/* Expense Type */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Expense Type *
              </label>
              <input
                type="text"
                value={formData.expense_type}
                onChange={(e) => setFormData({ ...formData, expense_type: e.target.value })}
                placeholder="e.g., Staff Salary, Utilities, Maintenance"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                required
              />
            </div>

            {/* Amount */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Amount (Rs.) *
              </label>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                required
              />
            </div>

            {/* Paid To */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Paid To
              </label>
              <input
                type="text"
                value={formData.paid_to}
                onChange={(e) => setFormData({ ...formData, paid_to: e.target.value })}
                placeholder="Person or company name"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* Description */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description of expense"
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

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
                placeholder="Additional notes"
                rows={2}
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
                onClick={() => navigate('/app/adda')}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Create Expense'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
