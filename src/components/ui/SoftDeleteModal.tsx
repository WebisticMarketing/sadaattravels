/**
 * Shared soft-delete confirmation modal.
 *
 * Mirrors the delete-confirmation pattern already used on the record
 * detail pages (MaintenanceDetailPage, TyreDetailPage, etc.): requires a
 * reason, explains that the record moves to Deleted Data (the recycle
 * bin) and is NOT permanently destroyed, and surfaces server-side RPC
 * errors returned by soft_delete_record.
 */

import { useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Alert } from './Alert';

interface SoftDeleteModalProps {
  title: string;
  /** Short human summary of the record being deleted. */
  recordSummary?: string;
  submitting: boolean;
  error: string | null;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}

export function SoftDeleteModal({
  title,
  recordSummary,
  submitting,
  error,
  onConfirm,
  onClose,
}: SoftDeleteModalProps) {
  const [reason, setReason] = useState('');

  const handleConfirm = () => {
    if (!reason.trim() || submitting) return;
    onConfirm(reason.trim());
  };

  return (
    <Modal open={true} onClose={onClose} title={title}>
      <div className="space-y-4">
        <Alert variant="warning" title="Soft Delete">
          This will move the record to Deleted Data (the recycle bin).
          It will stop appearing in lists and reports, but it is NOT destroyed —
          an OWNER or MANAGER can restore it later from Account → Deleted Data.
        </Alert>

        {recordSummary && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
              Record
            </p>
            <p className="mt-1 text-sm text-gray-900">{recordSummary}</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Reason for Deletion *
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Explain why this record is being deleted"
          />
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleConfirm}
            disabled={!reason.trim() || submitting}
            className="flex-1"
          >
            {submitting ? 'Deleting...' : 'Move to Recycle Bin'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
