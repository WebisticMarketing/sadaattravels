import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBuses } from '../hooks/useBuses';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { Loading } from '../components/ui/Loading';
import { Alert } from '../components/ui/Alert';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import { SearchInput } from '../components/ui/SearchInput';
import { SummaryCard } from '../components/ui/SummaryCard';
import { formatCurrency } from '../lib/utils';
import { Bus as BusIcon, Plus, Edit2 } from 'lucide-react';
import { createBus, updateBus } from '../hooks/useBuses';

export default function BusesPage() {
  const navigate = useNavigate();
  const { buses, loading, error, refetch } = useBuses(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedBus, setSelectedBus] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Filter buses
  const filteredBuses = buses.filter(bus => {
    const matchesSearch = !searchQuery || 
      bus.registration_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (bus.bus_name && bus.bus_name.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = !statusFilter || bus.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate summary stats
  const activeBuses = filteredBuses.filter(b => b.status === 'active').length;
  const totalBuses = filteredBuses.length;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loading size="lg" label="Loading buses..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <Alert variant="danger" title="Failed to load buses">
          {error}
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader 
        title="Buses" 
        description="Manage your bus fleet"
      >
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Bus
        </Button>
      </PageHeader>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SummaryCard
          label="Active Buses"
          value={activeBuses}
          icon={<BusIcon className="h-6 w-6" />}
        />
        <SummaryCard
          label="Total Buses"
          value={totalBuses}
          icon={<BusIcon className="h-6 w-6" />}
        />
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by registration or name..."
          />
          <Select
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: '', label: 'All statuses' },
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
              { value: 'maintenance', label: 'Maintenance' },
            ]}
          />
        </div>
      </Card>

      {/* Bus List */}
      {buses.length === 0 ? (
        <EmptyState
          title="No buses yet"
          description="Add your first bus to get started"
          icon={<BusIcon className="h-8 w-8" />}
          action={
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add First Bus
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {buses.map((bus) => (
            <Card key={bus.id} className="p-4 cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate(`/app/buses/${bus.id}`)}>
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">
                      {bus.registration_number}
                    </h3>
                    {bus.bus_name && (
                      <p className="text-sm text-gray-600">{bus.bus_name}</p>
                    )}
                  </div>
                  <Badge
                    variant={bus.status === 'active' ? 'success' : 'secondary'}
                    size="sm"
                  >
                    {bus.status}
                  </Badge>
                </div>

                {/* Details */}
                <div className="space-y-1 text-sm">
                  {bus.bus_type && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Type:</span>
                      <span className="font-medium">{bus.bus_type}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-500">Capacity:</span>
                    <span className="font-medium">{bus.capacity} seats</span>
                  </div>
                </div>

                {/* Stats */}
                {bus.totalTrips !== undefined && (
                  <div className="border-t border-gray-200 pt-3">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-xs text-gray-500">Trips</p>
                        <p className="font-semibold text-gray-900">
                          {bus.totalTrips}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Revenue</p>
                        <p className="font-semibold text-green-600">
                          {formatCurrency(bus.totalRevenue || 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Trip Expenses</p>
                        <p className="font-semibold text-red-600">
                          {formatCurrency(bus.totalExpenses || 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Maintenance</p>
                        <p className="font-semibold text-amber-600">
                          {formatCurrency(bus.totalMaintenanceCost || 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Tyres</p>
                        <p className="font-semibold text-purple-600">
                          {formatCurrency(bus.totalTyreCost || 0)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setSelectedBus(bus);
                      setShowEditModal(true);
                    }}
                  >
                    <Edit2 className="mr-1 h-3 w-3" />
                    Edit
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Bus Modal */}
      {showAddModal && (
        <AddBusModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            refetch();
          }}
        />
      )}

      {/* Edit Bus Modal */}
      {showEditModal && selectedBus && (
        <EditBusModal
          bus={selectedBus}
          onClose={() => {
            setShowEditModal(false);
            setSelectedBus(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setSelectedBus(null);
            refetch();
          }}
        />
      )}
    </div>
  );
}

interface AddBusModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

function AddBusModal({ onClose, onSuccess }: AddBusModalProps) {
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [busName, setBusName] = useState('');
  const [busType, setBusType] = useState('');
  const [capacity, setCapacity] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!registrationNumber.trim()) {
      setError('Registration number is required.');
      return;
    }

    if (!capacity) {
      setError('Capacity is required.');
      return;
    }

    const capacityNum = parseInt(capacity);
    if (isNaN(capacityNum) || capacityNum <= 0) {
      setError('Capacity must be a positive number.');
      return;
    }

    if (capacityNum > 100) {
      setError('Capacity seems too large. Please verify.');
      return;
    }

    setLoading(true);

    try {
      await createBus(
        registrationNumber.trim(),
        busName?.trim() || null,
        busType || null,
        capacityNum
      );

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create the bus right now. Please try again.');
      setLoading(false);
    }
  };

  return (
    <Modal open={true} onClose={onClose} title="Add New Bus">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Registration Number *"
          value={registrationNumber}
          onChange={(e) => setRegistrationNumber(e.target.value)}
          placeholder="e.g., ABC-1234"
          required
        />
        <Input
          label="Bus Name"
          value={busName}
          onChange={(e) => setBusName(e.target.value)}
          placeholder="e.g., City Express"
        />
        <Select
          label="Bus Type"
          value={busType}
          onChange={(e) => setBusType(e.target.value)}
          options={[
            { value: '', label: 'Select type' },
            { value: 'AC', label: 'AC' },
            { value: 'Non-AC', label: 'Non-AC' },
            { value: 'Sleeper', label: 'Sleeper' },
          ]}
        />
        <Input
          label="Capacity (seats) *"
          type="number"
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
          placeholder="e.g., 45"
          min="1"
          required
        />

        {error && (
          <Alert variant="danger" title="Error">
            {error}
          </Alert>
        )}

        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" loading={loading} className="flex-1">
            Add Bus
          </Button>
        </div>
      </form>
    </Modal>
  );
}

interface EditBusModalProps {
  bus: any;
  onClose: () => void;
  onSuccess: () => void;
}

function EditBusModal({ bus, onClose, onSuccess }: EditBusModalProps) {
  const [busName, setBusName] = useState(bus.bus_name || '');
  const [busType, setBusType] = useState(bus.bus_type || '');
  const [capacity, setCapacity] = useState(bus.capacity.toString());
  const [status, setStatus] = useState(bus.status);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await updateBus(bus.id, {
        bus_name: busName || null,
        bus_type: busType || null,
        capacity: parseInt(capacity),
        status: status as any,
      });

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update bus');
      setLoading(false);
    }
  };

  return (
    <Modal open={true} onClose={onClose} title="Edit Bus">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700">
            Registration Number
          </label>
          <p className="mt-1 text-gray-900">{bus.registration_number}</p>
        </div>

        <Input
          label="Bus Name"
          value={busName}
          onChange={(e) => setBusName(e.target.value)}
          placeholder="e.g., City Express"
        />
        <Select
          label="Bus Type"
          value={busType}
          onChange={(e) => setBusType(e.target.value)}
          options={[
            { value: '', label: 'Select type' },
            { value: 'AC', label: 'AC' },
            { value: 'Non-AC', label: 'Non-AC' },
            { value: 'Sleeper', label: 'Sleeper' },
          ]}
        />
        <Input
          label="Capacity (seats)"
          type="number"
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
          min="1"
          required
        />
        <Select
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          options={[
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
            { value: 'maintenance', label: 'Maintenance' },
          ]}
        />

        {error && (
          <Alert variant="danger" title="Error">
            {error}
          </Alert>
        )}

        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" loading={loading} className="flex-1">
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}
