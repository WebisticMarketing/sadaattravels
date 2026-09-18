import { useNavigate, useParams } from 'react-router-dom';
import { useFuelSale } from '../hooks/useFuelSales';
import { formatCurrency, formatDate } from '../lib/utils';
import { ArrowLeft } from 'lucide-react';

export default function FuelSaleDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { sale, loading, error } = useFuelSale(id || null);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <p className="mt-2 text-sm text-gray-500">Loading fuel sale...</p>
        </div>
      </div>
    );
  }

  if (error || !sale) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/app/petrol/sales')}
            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{error || 'Fuel sale not found'}</p>
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
            onClick={() => navigate('/app/petrol/sales')}
            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">
                {sale.sale_type === 'EXTERNAL_CUSTOMER'
                  ? sale.customer_name || 'External Customer'
                  : sale.buses?.registration_number || 'Internal Bus'}
              </h1>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  sale.sale_type === 'EXTERNAL_CUSTOMER'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-blue-100 text-blue-700'
                }`}
              >
                {sale.sale_type === 'EXTERNAL_CUSTOMER' ? 'External' : 'Internal'}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  sale.status === 'active'
                    ? 'bg-blue-100 text-blue-700'
                    : sale.status === 'reversed'
                    ? 'bg-gray-100 text-gray-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {sale.status}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Sale Date: {formatDate(new Date(sale.sale_date))}
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Total Amount</p>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(sale.total_amount)}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Litres</p>
          <p className="text-2xl font-bold text-gray-900">
            {sale.litres.toFixed(2)} L
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Sale Price/Litre</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(sale.sale_price_per_litre)}
          </p>
        </div>
      </div>

      {/* Sale Details */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Sale Details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-gray-500">Sale Type</p>
            <p className="text-base text-gray-900">
              {sale.sale_type === 'EXTERNAL_CUSTOMER' ? 'External Customer' : 'Internal Bus'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Sale Date</p>
            <p className="text-base text-gray-900">{formatDate(new Date(sale.sale_date))}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Created At</p>
            <p className="text-base text-gray-900">
              {formatDate(new Date(sale.created_at))}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Cost Price/Litre</p>
            <p className="text-base text-gray-900">
              {formatCurrency(sale.cost_price_per_litre)}
            </p>
          </div>
          {sale.receipt_number && (
            <div>
              <p className="text-sm text-gray-500">Receipt Number</p>
              <p className="text-base text-gray-900">{sale.receipt_number}</p>
            </div>
          )}
          {sale.customer_phone && sale.sale_type === 'EXTERNAL_CUSTOMER' && (
            <div>
              <p className="text-sm text-gray-500">Customer Phone</p>
              <p className="text-base text-gray-900">{sale.customer_phone}</p>
            </div>
          )}
          {sale.buses && sale.sale_type === 'INTERNAL_BUS' && (
            <>
              <div>
                <p className="text-sm text-gray-500">Bus Registration</p>
                <p className="text-base text-gray-900">{sale.buses.registration_number}</p>
              </div>
              {sale.buses.bus_name && (
                <div>
                  <p className="text-sm text-gray-500">Bus Name</p>
                  <p className="text-base text-gray-900">{sale.buses.bus_name}</p>
                </div>
              )}
            </>
          )}
          {sale.trips && (
            <>
              <div>
                <p className="text-sm text-gray-500">Trip Date</p>
                <p className="text-base text-gray-900">{formatDate(new Date(sale.trips.trip_date))}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Route</p>
                <p className="text-base text-gray-900">{sale.trips.route}</p>
              </div>
            </>
          )}
        </div>
        {sale.notes && (
          <div className="mt-4">
            <p className="text-sm text-gray-500">Notes</p>
            <p className="text-base text-gray-900 whitespace-pre-wrap">{sale.notes}</p>
          </div>
        )}
        {sale.reversal_reason && (
          <div className="mt-4">
            <p className="text-sm text-gray-500">Reversal Reason</p>
            <p className="text-base text-gray-900">{sale.reversal_reason}</p>
            {sale.reversed_at && (
              <p className="mt-1 text-xs text-gray-500">
                Reversed on {formatDate(new Date(sale.reversed_at))}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
