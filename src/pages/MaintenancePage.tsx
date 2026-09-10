import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMaintenance } from '../hooks/useMaintenance';
import { useBuses } from '../hooks/useBuses';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Input } from '../components/ui/Input';
import { Loading } from '../components/ui/Loading';
import { Alert } from '../components/ui/Alert';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { formatCurrency, formatDate } from '../lib/utils';
import { Plus, Filter, Wrench, Calendar, Bus } from 'lucide-react';

export default function MaintenancePage() {
  const navigate = useNavigate();
  const { buses } = useBuses();
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    busId: '',
    maintenanceType: '',
    status: '',
  });

  const { records, loading, error } = useMaintenance({
    startDate: filters.startDate || undefined,
    endDate: filters.endDate || undefined,
    busId: filters.busId || undefined,
    maintenanceType: filters.maintenanceType || undefined,
    status: filters.status || undefined,
  });

  const [showFilters, setShowFilters] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loading size="lg" label="Loading maintenance records..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <Alert variant="danger" title="Failed to load maintenance records">
          {error}
        </Alert>
      </div>
    );
  }

  const activeRecords = records.filter(r => r.status === 'active');
  const totalCost = activeRecords.reduce((sum, r) => sum + r.cost, 0);

  // Get unique maintenance types for filter
  const maintenanceTypes = Array.from(new Set(records.map(r => r.maintenance_type))).sort();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Maintenance</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track bus maintenance records and costs
          </p>
        </div>
        <Button onClick={() => navigate('/app/maintenance/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Add Record
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <Wrench className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Records</p>
              <p className="text-xl font-bold text-gray-900">{records.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
              <Wrench className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Active Records</p>
              <p className="text-xl font-bold text-gray-900">{activeRecords.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 col-span-2 sm:col-span-1">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
              <Wrench className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Cost</p>
              <p className="text-xl font-bold text-amber-600">
                {formatCurrency(totalCost)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">Filters</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="mr-1 h-4 w-4" />
            {showFilters ? 'Hide' : 'Show'}
          </Button>
        </div>

        {showFilters && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Input
              label="Start Date"
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            />
            <Input
              label="End Date"
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            />
            <Select
              label="Bus"
              value={filters.busId}
              onChange={(e) => setFilters({ ...filters, busId: e.target.value })}
              options={[
                { value: '', label: 'All buses' },
                ...buses.map(b => ({
                  value: b.id,
                  label: b.registration_number,
                })),
              ]}
            />
            <Select
              label="Type"
              value={filters.maintenanceType}
              onChange={(e) => setFilters({ ...filters, maintenanceType: e.target.value })}
              options={[
                { value: '', label: 'All types' },
                ...maintenanceTypes.map(type => ({
                  value: type,
                  label: type,
                })),
              ]}
            />
            <Select
              label="Status"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              options={[
                { value: '', label: 'All statuses' },
                { value: 'active', label: 'Active' },
                { value: 'reversed', label: 'Reversed' },
              ]}
            />
          </div>
        )}
      </Card>

      {/* Records List */}
      {records.length === 0 ? (
        <EmptyState
          title="No maintenance records found"
          description={showFilters ? 'Try adjusting your filters' : 'Add your first maintenance record to get started'}
          icon={<Wrench className="h-8 w-8" />}
          action={
            !showFilters && (
              <Button onClick={() => navigate('/app/maintenance/new')}>
                <Plus className="mr-2 h-4 w-4" />
                Add First Record
              </Button>
            )
          }
        />
      ) : (
        <div className="space-y-3">
          {records.map((record) => (
            <div
              key={record.id}
              className="cursor-pointer"
              onClick={() => navigate(`/app/maintenance/${record.id}`)}
            >
              <Card className="p-4 hover:shadow-md transition-shadow">
                <div className="space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">
                          {record.maintenance_type}
                        </h3>
                        <Badge
                          variant={record.status === 'active' ? 'success' : 'secondary'}
                          size="sm"
                        >
                          {record.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(new Date(record.maintenance_date))}
                        </span>
                        <span className="flex items-center gap-1">
                          <Bus className="h-3 w-3" />
                          {record.bus?.registration_number || 'Unknown'}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Cost</p>
                      <p className="text-lg font-bold text-amber-600">
                        {formatCurrency(record.cost)}
                      </p>
                    </div>
                  </div>

                  {/* Description */}
                  {record.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {record.description}
                    </p>
                  )}

                  {/* Performed by */}
                  {record.performed_by && (
                    <p className="text-xs text-gray-500">
                      Performed by: {record.performed_by}
                    </p>
                  )}
                </div>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
