import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPersonalExpense } from '../hooks/usePersonalExpenses';
import { formatDate } from '../lib/utils';
import { ArrowLeft } from 'lucide-react';

export default function PersonalExpenseFormPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    expense_date: formatDate(new Date()),
    category: '',
    description: '',
    amount: '',
    paid_by: '',
    notes: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!formData.category.trim()) {
        throw new Error('Please enter a category');
      }
      if (!formData.description.trim()) {
        throw new Error('Please enter a description');
      }
      if (!formData.amount || parseFloat(formData.amount) <= 0) {
        throw new Error('Amount must be greater than 0');
      }

      // Convert date from DD/MM/YYYY to YYYY-MM-DD for database
      const [day, month, year] = formData.expense_date.split('/');
      const isoDate = `${year}-${month}-${day}`;

      await createPersonalExpense({
        expense_date: isoDate,
        category: formData.category.trim(),
        description: formData.description.trim(),
        amount: parseFloat(formData.amount),
        paid_by: formData.paid_by.trim() || undefined,
        notes: formData.notes.trim() || undefined,
      });

      navigate('/app/expenses');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create expense');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/app/expenses')}
          className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Personal Expense</h1>
          <p className="mt-1 text-sm text-gray-500">
            Record a personal expense (not included in business accounting)
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm text-amber-900">
          <strong>Note:</strong> Personal expenses are separate from business accounting and are not included in business financial reports.
        </p>
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

            {/* Category */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Category *
              </label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="e.g., Household, Vehicle, Medical, Education"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the expense"
                rows={3}
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

            {/* Paid By */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Paid By
              </label>
              <input
                type="text"
                value={formData.paid_by}
                onChange={(e) => setFormData({ ...formData, paid_by: e.target.value })}
                placeholder="Who paid for this expense"
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
                onClick={() => navigate('/app/expenses')}
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
