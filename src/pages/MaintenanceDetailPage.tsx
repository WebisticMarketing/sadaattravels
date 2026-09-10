import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMaintenance, reverseMaintenanceRecord } from '../hooks/useMaintenance';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Loading } from '../components/ui/Loading';
import { Alert } from '../components/ui/Alert';
import { Badge } from '../components/ui/Badge';
import { formatCurrency, formatDate } from '../lib/utils';
import { ArrowLeft, Edit2, XCircle, Calendar, Bus, Wrench } from 'lucide-react';

export default function MaintenanceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { records, loading, error, refetch } = useMaintenance();

  const [showReverseModal, setShowReverseModal] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loading size="lg" label="Loading maintenance record..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <Alert variant="danger" title="Failed to load maintenance record">
          {error}
        </Alert>
      </div>
    );
  }

  const record = records.find(r => r.id === id);

  if (!record) {
    return (
      <div className="p-4">
        <Alert variant="warning" title="Record not found">
          This maintenance record does not exist or has been deleted.
        </Alert>
        <Button
          variant="secondary"
          className="mt-4"
          onClick={() => navigate('/app/maintenance')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Maintenance
        </Button>
      </div>
    );
  }

  const handleReverse = async (reason: string) => {
    try {
      await reverseMaintenanceRecord(record.id, reason);
      refetch();
      setShowReverseModal(false);
    } catch (err) {
      console.error('Failed to reverse record:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/app/maintenance')}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">
                {record.maintenance_type}
              </h1>
              <Badge
                variant={record.status === 'active' ? 'success' : 'secondary'}
                size="sm"
              >
                {record.status}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              {formatDate(new Date(record.maintenance_date))}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {record.status === 'active' && (
            <>
              <Button
                variant="secondary"
                onClick={() => navigate(`/app/maintenance/${id}/edit`)}
              >
                <Edit2 className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <Button
                variant="danger"
                onClick={() => setShowReverseModal(true)}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Reverse
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main Details */}
      <Card className="p-6">
        <div className="space-y-6">
          {/* Bus Info */}
          <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
              <Bus className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Bus</p>
              <p className="text-lg font-semibold text-gray-900">
                {record.bus?.registration_number || 'Unknown'}
              </p>
              {record.bus?.bus_name && (
                <p className="text-sm text-gray-600">{record.bus.bus_name}</p>
              )}
            </div>
          </div>

          {/* Maintenance Details */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Wrench className="h-4 w-4 text-gray-400" />
                <p className="text-sm text-gray-500">Maintenance Type</p>
              </div>
              <p className="text-base font-medium text-gray-900">
                {record.maintenance_type}
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="h-4 w-4 text-gray-400" />
                <p className="text-sm text-gray-500">Date</p>
              </div>
              <p className="text-base font-medium text-gray-900">
                {formatDate(new Date(record.maintenance_date))}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500 mb-1">Cost</p>
              <p className="text-2xl font-bold text-amber-600">
                {formatCurrency(record.cost)}
              </p>
            </div>

            {record.performed_by && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Performed By</p>
                <p className="text-base font-medium text-gray-900">
                  {record.performed_by}
                </p>
              </div>
            )}
          </div>

          {/* Description */}
          {record.description && (
            <div>
              <p className="text-sm text-gray-500 mb-2">Description</p>
              <p className="text-base text-gray-900 whitespace-pre-wrap">
                {record.description}
              </p>
            </div>
          )}

          {/* Next Maintenance */}
          {record.next_maintenance_date && (
            <div className="pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="h-4 w-4 text-gray-400" />
                <p className="text-sm text-gray-500">Next Maintenance Scheduled</p>
              </div>
              <p className="text-base font-medium text-gray-900">
                {formatDate(new Date(record.next_maintenance_date))}
              </p>
            </div>
          )}

          {/* Notes */}
          {record.notes && (
            <div className="pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-500 mb-2">Notes</p>
              <p className="text-base text-gray-900 whitespace-pre-wrap">
                {record.notes}
              </p>
            </div>
          )}

          {/* Reversal Info */}
          {record.status === 'reversed' && (
            <div className="pt-4 border-t border-gray-200">
              <Alert variant="warning" title="Record Reversed">
                <p>This record was reversed on {record.reversed_at ? formatDate(new Date(record.reversed_at)) : 'unknown date'}.</p>
                {record.reversal_reason && (
                  <p className="mt-2"><strong>Reason:</strong> {record.reversal_reason}</p>
                )}
              </Alert>
            </div>
          )}
        </div>
      </Card>

      {/* Reverse Modal */}
      {showReverseModal && (
        <ReverseModal
          onConfirm={handleReverse}
          onClose={() => setShowReverseModal(false)}
        />
      )}
    </div>
  );
}

interface ReverseModalProps {
  onConfirm: (reason: string) => void;
  onClose: () => void;
}

function ReverseModal({ onConfirm, onClose }: ReverseModalProps) {
  const [reason, setReason] = useState('');

  const handleConfirm = () => {
    if (reason.trim()) {
      onConfirm(reason.trim());
    }
  };

  return (
    <Modal
      open={true}
      onClose={onClose}
      title="Reverse Maintenance Record"
    >
      <div className="space-y-4">
        <Alert variant="warning" title="Warning">
          Reversing this record will exclude it from cost calculations and bus profitability reports.
        </Alert>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Reason for Reversal *
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Explain why this record is being reversed"
          />
        </div>

        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={onClose}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleConfirm}
            disabled={!reason.trim()}
            className="flex-1"
          >
            Reverse Record
          </Button>
        </div>
      </div>
    </Modal>
  );
}
