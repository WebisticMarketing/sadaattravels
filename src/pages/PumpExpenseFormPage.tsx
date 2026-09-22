import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPumpExpense, type PumpExpenseType } from '../hooks/usePumpExpenses';
import { formatDate } from '../lib/utils';
import { ArrowLeft } from 'lucide-react';

const EXPENSE_TYPES: { value: PumpExpenseType; label: string }[] = [
  { value: 'ELECTRICITY', label: 'Electricity' },
  { value: 'STAFF_SALARY', label: 'Staff Salary' },
  { value: 'PUMP_REPAIR', label: 'Pump Repair/Maintenance' },
  { value: 'GENERATOR', label: 'Generator Expenses' },
  { value: 'CLEANING', label: 'Cleaning' },
  { value: 'EQUIPMENT', label: 'Equipment' },
  { value: 'OTHER', label: 'Other' },
];

export default function PumpExpenseFormPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    expense_date: formatDate(new Date()),
    expense_type: '' as PumpExpenseType | '',
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
      if (!formData.expense_type) {
        throw new Error('Please select expense type');
      }
      if (!formData.amount || parseFloat(formData.amount) <= 0) {
        throw new Error('Amount must be greater than 0');
      }

      // Convert date from DD/MM/YYYY to YYYY-MM-DD for database
      const [day, month, year] = formData.expense_date.split('/');
      const isoDate = `${year}-${month}-${day}`;

      await createPumpExpense({
        expense_date: isoDate,
        expense_type: formData.expense_type as PumpExpenseType,
        amount: parseFloat(formData.amount),
        description: formData.description.trim() || undefined,
        paid_to: formData.paid_to.trim() || undefined,
        receipt_number: formData.receipt_number.trim() || undefined,
        notes: formData.notes.trim() || undefined,
      });

      navigate('/app/petrol');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create pump expense record');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/app/petrol')}
          className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Pump Expense</h1>
          <p className="mt-1 text-sm text-gray-500">Record a new petrol pump operating expense</p>
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
              <select
                value={formData.expense_type}
                onChange={(e) => setFormData({ ...formData, expense_type: e.target.value as PumpExpenseType })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                required
              >
                <option value="">Select expense type</option>
                {EXPENSE_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Amount */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Amount (Rs.) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="Enter amount"
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
                placeholder="Recipient name"
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
                placeholder="Receipt/invoice number"
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
                placeholder="Brief description of the expense"
                rows={2}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Additional Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any additional information"
                rows={2}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/app/petrol')}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Expense'}
          </button>
        </div>
      </form>
    </div>
  );
}
