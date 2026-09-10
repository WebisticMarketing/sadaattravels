import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createInstallment } from '../hooks/useInstallments';
import { formatDate } from '../lib/utils';
import { ArrowLeft } from 'lucide-react';

export default function InstallmentFormPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    installment_type: 'taken' as 'taken' | 'given',
    person_name: '',
    person_phone: '',
    total_amount: '',
    start_date: formatDate(new Date()),
    description: '',
    notes: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!formData.person_name.trim()) {
        throw new Error('Please enter person name');
      }
      if (!formData.total_amount || parseFloat(formData.total_amount) <= 0) {
        throw new Error('Total amount must be greater than 0');
      }

      // Convert date from DD/MM/YYYY to YYYY-MM-DD for database
      const [day, month, year] = formData.start_date.split('/');
      const isoDate = `${year}-${month}-${day}`;

      await createInstallment({
        installment_type: formData.installment_type,
        person_name: formData.person_name.trim(),
        person_phone: formData.person_phone.trim() || undefined,
        total_amount: parseFloat(formData.total_amount),
        start_date: isoDate,
        description: formData.description.trim() || undefined,
        notes: formData.notes.trim() || undefined,
      });

      navigate('/app/installments');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create installment');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/app/installments')}
          className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Installment</h1>
          <p className="mt-1 text-sm text-gray-500">
            Record a new loan (taken or given)
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="space-y-4">
            {/* Installment Type */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Type *
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, installment_type: 'taken' })}
                  className={`rounded-lg border-2 p-4 text-left transition-colors ${
                    formData.installment_type === 'taken'
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className="font-medium text-gray-900">Loan Taken</p>
                  <p className="mt-1 text-xs text-gray-500">
                    We borrowed money (expense)
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, installment_type: 'given' })}
                  className={`rounded-lg border-2 p-4 text-left transition-colors ${
                    formData.installment_type === 'given'
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className="font-medium text-gray-900">Loan Given</p>
                  <p className="mt-1 text-xs text-gray-500">
                    We lent money (receivable)
                  </p>
                </button>
              </div>
            </div>

            {/* Person Name */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Person Name *
              </label>
              <input
                type="text"
                value={formData.person_name}
                onChange={(e) => setFormData({ ...formData, person_name: e.target.value })}
                placeholder="Person or company name"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                required
              />
            </div>

            {/* Person Phone */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Phone Number
              </label>
              <input
                type="text"
                value={formData.person_phone}
                onChange={(e) => setFormData({ ...formData, person_phone: e.target.value })}
                placeholder="Contact number"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* Total Amount */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Total Amount (Rs.) *
              </label>
              <input
                type="number"
                value={formData.total_amount}
                onChange={(e) => setFormData({ ...formData, total_amount: e.target.value })}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                required
              />
            </div>

            {/* Start Date */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Start Date *
              </label>
              <input
                type="text"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                placeholder="DD/MM/YYYY"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                required
              />
              <p className="mt-1 text-xs text-gray-500">Format: DD/MM/YYYY</p>
            </div>

            {/* Description */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Description
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="e.g., Bus loan, Personal loan"
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
                placeholder="Additional notes or terms"
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* Info Box */}
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm text-blue-900">
                <strong>Financial Impact:</strong>
              </p>
              <ul className="mt-2 space-y-1 text-xs text-blue-700">
                {formData.installment_type === 'taken' ? (
                  <>
                    <li>• Payments made will be counted as business expenses</li>
                    <li>• Remaining balance is a liability</li>
                  </>
                ) : (
                  <>
                    <li>• Payments received are loan recoveries (not operating revenue)</li>
                    <li>• Remaining balance is an asset (receivable)</li>
                  </>
                )}
              </ul>
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
                onClick={() => navigate('/app/installments')}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Installment'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
