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
import { PageHeader } from '../components/ui/PageHeader';
import { SearchInput } from '../components/ui/SearchInput';
import { SummaryCard } from '../components/ui/SummaryCard';
import { PrintButton } from '../components/ui/PrintButton';
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
    search: '',
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

  // Filter records by search
  const filteredRecords = records.filter(record => {
    if (!filters.search) return true;
    const searchLower = filters.search.toLowerCase();
    return (
      record.maintenance_type.toLowerCase().includes(searchLower) ||
      record.description.toLowerCase().includes(searchLower) ||
      record.bus?.registration_number.toLowerCase().includes(searchLower)
    );
  });

  const activeRecords = filteredRecords.filter(r => r.status === 'active');
  const totalCost = activeRecords.reduce((sum, r) => sum + r.cost, 0);

  // Get unique maintenance types for filter
  const maintenanceTypes = Array.from(new Set(records.map(r => r.maintenance_type))).sort();

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader 
        title="Maintenance" 
        description="Track bus maintenance records and costs"
      >
        <div className="flex gap-2">
          <PrintButton />
          <Button onClick={() => navigate('/app/maintenance/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Add Record
          </Button>
        </div>
      </PageHeader>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <SummaryCard
          label="Total Records"
          value={records.length}
          icon={<Wrench className="h-6 w-6" />}
        />
        <SummaryCard
          label="Active Records"
          value={activeRecords.length}
          icon={<Wrench className="h-6 w-6" />}
          variant="success"
        />
        <SummaryCard
          label="Total Cost"
          value={formatCurrency(totalCost)}
          icon={<Wrench className="h-6 w-6" />}
          variant="warning"
        />
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

        {/* Search */}
        <div className="mb-3">
          <SearchInput
            value={filters.search}
            onChange={(value) => setFilters({ ...filters, search: value })}
            placeholder="Search by type, description, or bus..."
          />
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
      {filteredRecords.length === 0 ? (
        <EmptyState
          title="No maintenance records found"
          description={showFilters || filters.search ? 'Try adjusting your filters' : 'Add your first maintenance record to get started'}
          icon={<Wrench className="h-8 w-8" />}
          action={
            !showFilters && !filters.search && (
              <Button onClick={() => navigate('/app/maintenance/new')}>
                <Plus className="mr-2 h-4 w-4" />
                Add First Record
              </Button>
            )
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredRecords.map((record) => (
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
