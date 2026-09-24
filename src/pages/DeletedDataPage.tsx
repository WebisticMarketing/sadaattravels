import { useMemo, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  useDeletedRecords,
  restoreRecord,
  permanentDeleteRecord,
  getErrorMessage,
} from '../hooks/useDeletion';
import type { DeletedRecord, DeletableTableName } from '../types/database';
import { formatCurrency, formatDate, getMonthStart, getMonthEnd } from '../lib/utils';
import { MonthYearFilter } from '../components/ui/MonthYearFilter';
import { PageHeader } from '../components/ui/PageHeader';
import { SearchInput } from '../components/ui/SearchInput';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Alert } from '../components/ui/Alert';
import { Loading } from '../components/ui/Loading';
import { EmptyState } from '../components/ui/EmptyState';
import { Trash2, RotateCcw, ShieldAlert } from 'lucide-react';

/**
 * Deleted Data (recycle bin) page.
 * Route: /app/account/deleted-data
 *
 * Lists every record whose status is 'deleted', newest deletion first.
 * - Restore: available to OWNER and MANAGER (restores exact previous status).
 * - Permanent Delete: shown ONLY for OWNER + personal_expenses; requires
 *   typing the exact confirmation text. The RPC enforces the same rules
 *   server-side independently of this UI.
 */
export default function DeletedDataPage() {
  const { user } = useAuth();
  const isOwner = !!user?.roles?.includes('OWNER');

  const { records, loading, error, refetch } = useDeletedRecords();

  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());

  const [restoreTarget, setRestoreTarget] = useState<DeletedRecord | null>(null);
  const [permanentTarget, setPermanentTarget] = useState<DeletedRecord | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [working, setWorking] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const modules = useMemo(
    () => Array.from(new Set(records.map(r => r.module_label))).sort(),
    [records]
  );

  const filtered = useMemo(() => {
    const searchLower = search.trim().toLowerCase();
    // Selected calendar month range (browser-local time), same helpers as Cargo/Reports pages.
    const startDate = getMonthStart(selectedYear, selectedMonth);
    const endDate = getMonthEnd(selectedYear, selectedMonth);
    return records.filter(r => {
      if (moduleFilter && r.module_label !== moduleFilter) return false;
      if (!r.record_date || r.record_date < startDate || r.record_date > endDate) return false;
      if (searchLower) {
        const haystack = [
          r.description,
          r.module_label,
          r.deleted_by_name,
          r.record_id,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(searchLower)) return false;
      }
      return true;
    });
    // records are already ordered newest-deleted-first by the RPC
  }, [records, search, moduleFilter, selectedMonth, selectedYear]);

  const canPermanentDelete = (r: DeletedRecord) =>
    isOwner && r.table_name === 'personal_expenses';

  async function handleRestore() {
    if (!restoreTarget) return;
    try {
      setWorking(true);
      setActionError(null);
      await restoreRecord(restoreTarget.table_name as DeletableTableName, restoreTarget.record_id);
      setRestoreTarget(null);
      setActionSuccess('Record restored. It returned to its previous status and left the Deleted Data list.');
      await refetch();
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setWorking(false);
    }
  }

  async function handlePermanentDelete() {
    if (!permanentTarget) return;
    try {
      setWorking(true);
      setActionError(null);
      await permanentDeleteRecord(
        permanentTarget.table_name as DeletableTableName,
        permanentTarget.record_id,
        confirmText
      );
      setPermanentTarget(null);
      setConfirmText('');
      setActionSuccess('Record permanently deleted. This action cannot be undone.');
      await refetch();
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Deleted Data"
        description="Recycle bin — soft-deleted records that can be restored"
      />

      {error && <Alert variant="danger" title="Failed to load deleted records">{error}</Alert>}
      {actionError && <Alert variant="danger" title="Action failed">{actionError}</Alert>}
      {actionSuccess && (
        <Alert variant="success" title="Done" dismissible onDismiss={() => setActionSuccess(null)}>
          {actionSuccess}
        </Alert>
      )}

      {/* Filters */}
      <Card>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 items-end">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search record, module, deleted by..."
            className="lg:col-span-2"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Module</label>
            <select
              value={moduleFilter}
              onChange={e => setModuleFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All modules</option>
              {modules.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div className="lg:col-span-2">
            <MonthYearFilter
              month={selectedMonth}
              year={selectedYear}
              onMonthChange={setSelectedMonth}
              onYearChange={setSelectedYear}
            />
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card>
        {loading ? (
          <Loading label="Loading deleted records..." />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Trash2 className="h-8 w-8 text-gray-400" />}
            title="No deleted records"
            description="Soft-deleted records will appear here until they are restored."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead>
                <tr className="text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3">Module</th>
                  <th className="px-4 py-3">Record</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Original Date</th>
                  <th className="px-4 py-3">Deleted By</th>
                  <th className="px-4 py-3">Deleted Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(r => (
                  <tr key={`${r.table_name}:${r.record_id}`} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Badge variant="secondary">{r.module_label}</Badge>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <span className="block truncate" title={r.description ?? ''}>
                        {r.description ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {r.amount != null ? formatCurrency(Number(r.amount)) : '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {r.record_date ? formatDate(r.record_date) : '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{r.deleted_by_name ?? 'Unknown'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {r.deleted_at ? formatDate(r.deleted_at) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="success"
                          onClick={() => {
                            setActionError(null);
                            setRestoreTarget(r);
                          }}
                        >
                          <RotateCcw className="mr-1 h-3.5 w-3.5" />
                          Restore
                        </Button>
                        {canPermanentDelete(r) && (
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => {
                              setActionError(null);
                              setConfirmText('');
                              setPermanentTarget(r);
                            }}
                          >
                            <Trash2 className="mr-1 h-3.5 w-3.5" />
                            Permanent Delete
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Restore confirmation */}
      <Modal
        open={!!restoreTarget}
        onClose={() => setRestoreTarget(null)}
        title="Restore Record"
        description={`Restore this ${restoreTarget?.module_label ?? 'record'} from the recycle bin?`}
      >
        <div className="space-y-4">
          {restoreTarget && (
            <div className="rounded-lg bg-gray-50 p-3 text-sm space-y-1">
              <p><span className="font-medium">Module:</span> {restoreTarget.module_label}</p>
              <p><span className="font-medium">Record:</span> {restoreTarget.description ?? '—'}</p>
              {restoreTarget.amount != null && (
                <p><span className="font-medium">Amount:</span> {formatCurrency(Number(restoreTarget.amount))}</p>
              )}
              <p><span className="font-medium">Deleted:</span>{' '}
                {restoreTarget.deleted_at ? formatDate(restoreTarget.deleted_at) : '—'}
                {restoreTarget.deleted_by_name ? ` by ${restoreTarget.deleted_by_name}` : ''}
              </p>
            </div>
          )}
          <Alert variant="warning" title="Please note">
            Restoring this record will make it active again and may affect reports and totals.
          </Alert>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setRestoreTarget(null)} disabled={working}>
              Cancel
            </Button>
            <Button variant="success" onClick={handleRestore} loading={working}>
              Restore Record
            </Button>
          </div>
        </div>
      </Modal>

      {/* Permanent delete confirmation (OWNER + personal_expenses only) */}
      <Modal
        open={!!permanentTarget}
        onClose={() => { setPermanentTarget(null); setConfirmText(''); }}
        title="Permanent Delete"
        description="This permanently removes the record from the database."
      >
        <div className="space-y-4">
          {permanentTarget && (
            <div className="rounded-lg bg-gray-50 p-3 text-sm space-y-1">
              <p><span className="font-medium">Module:</span> {permanentTarget.module_label}</p>
              <p><span className="font-medium">Record:</span> {permanentTarget.description ?? '—'}</p>
              {permanentTarget.amount != null && (
                <p><span className="font-medium">Amount:</span> {formatCurrency(Number(permanentTarget.amount))}</p>
              )}
              <p><span className="font-medium">Deleted:</span>{' '}
                {permanentTarget.deleted_at ? formatDate(permanentTarget.deleted_at) : '—'}
                {permanentTarget.deleted_by_name ? ` by ${permanentTarget.deleted_by_name}` : ''}
              </p>
            </div>
          )}
          <Alert variant="danger" title="This cannot be undone">
            <div className="flex items-start gap-2">
              <ShieldAlert className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>
                The record will be physically erased from the database. Only an audit trail entry
                will remain. This action cannot be undone.
              </span>
            </div>
          </Alert>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type exactly: <code className="px-1 py-0.5 bg-red-50 text-red-700 rounded font-mono">PERMANENTLY DELETE</code>
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              autoComplete="off"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="PERMANENTLY DELETE"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => { setPermanentTarget(null); setConfirmText(''); }}
              disabled={working}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handlePermanentDelete}
              loading={working}
              disabled={confirmText !== 'PERMANENTLY DELETE'}
            >
              Permanently Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
