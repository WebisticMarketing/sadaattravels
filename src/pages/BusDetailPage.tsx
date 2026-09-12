import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Loading } from '../components/ui/Loading';
import { Alert } from '../components/ui/Alert';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { formatCurrency, formatDate } from '../lib/utils';
import { 
  ArrowLeft, 
  Bus as BusIcon, 
  Calendar, 
  Wrench, 
  Settings,
  DollarSign,
  MapPin,
  Edit2,
  FileText,
  Plus
} from 'lucide-react';
import { supabase } from '../services/supabase';
import type { Bus, Trip, MaintenanceRecord, TyreRecord } from '../types/database';

interface BusDetails {
  bus: Bus | null;
  trips: TripWithRevenue[];
  maintenance: MaintenanceRecordWithDetails[];
  tyres: TyreRecordWithDetails[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

interface TripWithRevenue extends Trip {
  revenue?: number;
  expenses?: number;
}

interface MaintenanceRecordWithDetails extends MaintenanceRecord {
  performed_by_name?: string | null;
}

interface TyreRecordWithDetails extends TyreRecord {
  supplier_name?: string | null;
}

export default function BusDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [busDetails, setBusDetails] = useState<BusDetails>({
    bus: null,
    trips: [],
    maintenance: [],
    tyres: [],
    loading: true,
    error: null,
    refetch: fetchBusDetails,
  });

  async function fetchBusDetails() {
    if (!id) return;
    
    try {
      setBusDetails(prev => ({ ...prev, loading: true, error: null }));

      // Fetch bus details
      const { data: bus, error: busError } = await supabase
        .from('buses')
        .select('*')
        .eq('id', id)
        .single();

      if (busError) throw busError;
      if (!bus) {
        setBusDetails(prev => ({ ...prev, loading: false, error: 'Bus not found' }));
        return;
      }

      // Fetch trips with revenue/expenses
      const { data: tripsData } = await supabase
        .from('trips')
        .select(`
          *,
          trip_revenue_entries(amount, status),
          trip_expenses(amount, status)
        `)
        .eq('bus_id', id)
        .order('trip_date', { ascending: false })
        .limit(20);

      const trips = (tripsData || []).map((trip: any) => {
        const revenue = trip.trip_revenue_entries
          ?.filter((e: any) => e.status !== 'reversed')
          .reduce((sum: number, e: any) => sum + e.amount, 0) || 0;
        const expenses = trip.trip_expenses
          ?.filter((e: any) => e.status !== 'reversed')
          .reduce((sum: number, e: any) => sum + e.amount, 0) || 0;
        
        return {
          ...trip,
          trip_revenue_entries: undefined,
          trip_expenses: undefined,
          revenue,
          expenses,
        };
      });

      // Fetch maintenance records
      const { data: maintenanceData } = await supabase
        .from('maintenance_records')
        .select(`
          *,
          performed_by:users(full_name)
        `)
        .eq('bus_id', id)
        .order('maintenance_date', { ascending: false })
        .limit(10);

      const maintenance = (maintenanceData || []).map(record => ({
        ...record,
        performed_by_name: (record.performed_by as any)?.full_name || record.performed_by,
        performed_by: undefined,
      }));

      // Fetch tyre records
      const { data: tyreData } = await supabase
        .from('tyre_records')
        .select('*')
        .eq('bus_id', id)
        .order('purchase_date', { ascending: false })
        .limit(10);

      setBusDetails({
        bus,
        trips,
        maintenance,
        tyres: tyreData || [],
        loading: false,
        error: null,
        refetch: fetchBusDetails,
      });
    } catch (err) {
      console.error('Failed to fetch bus details:', err);
      setBusDetails(prev => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load bus details',
      }));
    }
  }

  // Initial fetch
  useEffect(() => {
    fetchBusDetails();
  }, []);

  if (busDetails.loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loading size="lg" label="Loading bus details..." />
      </div>
    );
  }

  if (busDetails.error || !busDetails.bus) {
    return (
      <div className="p-4">
        <Alert variant="danger" title="Failed to load bus details">
          {busDetails.error || 'Bus not found'}
        </Alert>
        <Button
          variant="secondary"
          className="mt-4"
          onClick={() => navigate('/app/buses')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Buses
        </Button>
      </div>
    );
  }

  const { bus, trips, maintenance, tyres } = busDetails;

  // Calculate stats
  const totalTrips = trips.length;
  const totalRevenue = trips.reduce((sum, t) => sum + (t.revenue || 0), 0);
  const totalExpenses = trips.reduce((sum, t) => sum + (t.expenses || 0), 0);
  const totalMaintenanceCost = maintenance.reduce((sum, m) => sum + m.cost, 0);
  const totalTyreCost = tyres.reduce((sum, t) => sum + t.total_cost, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/app/buses')}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">
                {bus.registration_number}
              </h1>
              <Badge
                variant={bus.status === 'active' ? 'success' : 'secondary'}
                size="sm"
              >
                {bus.status}
              </Badge>
            </div>
            {bus.bus_name && (
              <p className="mt-1 text-sm text-gray-500">{bus.bus_name}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Link to={`/app/buses/${id}/vouchers`}>
            <Button variant="secondary" size="sm">
              <FileText className="mr-1 h-3 w-3" />
              View Vouchers
            </Button>
          </Link>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowEditModal(true)}
          >
            <Edit2 className="mr-1 h-3 w-3" />
            Edit Bus
          </Button>
        </div>
      </div>

      {/* Bus Info Card */}
      <Card className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <BusIcon className="h-4 w-4" />
              <span className="text-sm">Type</span>
            </div>
            <p className="font-semibold text-gray-900">
              {bus.bus_type || 'Not specified'}
            </p>
          </div>
          <div>
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <Settings className="h-4 w-4" />
              <span className="text-sm">Capacity</span>
            </div>
            <p className="font-semibold text-gray-900">
              {bus.capacity} seats
            </p>
          </div>
          {bus.purchase_date && (
            <div>
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <Calendar className="h-4 w-4" />
                <span className="text-sm">Purchase Date</span>
              </div>
              <p className="font-semibold text-gray-900">
                {formatDate(new Date(bus.purchase_date))}
              </p>
            </div>
          )}
          {bus.purchase_cost && (
            <div>
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <DollarSign className="h-4 w-4" />
                <span className="text-sm">Purchase Cost</span>
              </div>
              <p className="font-semibold text-gray-900">
                {formatCurrency(bus.purchase_cost)}
              </p>
            </div>
          )}
        </div>
        {bus.notes && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">{bus.notes}</p>
          </div>
        )}
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="p-4">
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">Total Trips</p>
            <p className="text-2xl font-bold text-gray-900">{totalTrips}</p>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">Trip Revenue</p>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(totalRevenue)}
            </p>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">Trip Expenses</p>
            <p className="text-2xl font-bold text-red-600">
              {formatCurrency(totalExpenses)}
            </p>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">Maintenance</p>
            <p className="text-2xl font-bold text-amber-600">
              {formatCurrency(totalMaintenanceCost)}
            </p>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">Tyres</p>
            <p className="text-2xl font-bold text-purple-600">
              {formatCurrency(totalTyreCost)}
            </p>
          </div>
        </Card>
      </div>

      {/* Trips Section */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900">Recent Trips</h2>
          </div>
          <Link to="/app/trips">
            <Button variant="ghost" size="sm">View All</Button>
          </Link>
        </div>
        {trips.length === 0 ? (
          <EmptyState
            title="No trips yet"
            description="This bus hasn't been assigned to any trips"
            icon={<MapPin className="h-8 w-8" />}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">Route</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase">Revenue</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase">Expenses</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase">Profit</th>
                </tr>
              </thead>
              <tbody>
                {trips.map(trip => (
                  <tr key={trip.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-3 text-sm text-gray-900">
                      {formatDate(new Date(trip.trip_date))}
                    </td>
                    <td className="py-3 px-3 text-sm text-gray-900">{trip.route}</td>
                    <td className="py-3 px-3">
                      <Badge
                        variant={trip.status === 'active' ? 'success' : 'secondary'}
                        size="sm"
                      >
                        {trip.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 text-sm text-right text-green-600 font-medium">
                      {formatCurrency(trip.revenue || 0)}
                    </td>
                    <td className="py-3 px-3 text-sm text-right text-red-600 font-medium">
                      {formatCurrency(trip.expenses || 0)}
                    </td>
                    <td className={`py-3 px-3 text-sm text-right font-medium ${
                      ((trip.revenue || 0) - (trip.expenses || 0)) >= 0 
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }`}>
                      {formatCurrency((trip.revenue || 0) - (trip.expenses || 0))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Maintenance Section */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900">Maintenance Records</h2>
          </div>
          <Link to="/app/maintenance">
            <Button variant="ghost" size="sm">View All</Button>
          </Link>
        </div>
        {maintenance.length === 0 ? (
          <EmptyState
            title="No maintenance records"
            description="This bus has no maintenance history"
            icon={<Wrench className="h-8 w-8" />}
          />
        ) : (
          <div className="space-y-3">
            {maintenance.map(record => (
              <div
                key={record.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900">{record.maintenance_type}</p>
                    <Badge
                      variant={record.status === 'active' ? 'success' : 'secondary'}
                      size="sm"
                    >
                      {record.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{record.description}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(new Date(record.maintenance_date))}
                    </span>
                    {record.performed_by_name && (
                      <span>By: {record.performed_by_name}</span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-amber-600">
                    {formatCurrency(record.cost)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Tyres Section */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900">Tyre Records</h2>
          </div>
          <Link to="/app/tyres">
            <Button variant="ghost" size="sm">View All</Button>
          </Link>
        </div>
        {tyres.length === 0 ? (
          <EmptyState
            title="No tyre records"
            description="This bus has no tyre purchase history"
            icon={<Settings className="h-8 w-8" />}
          />
        ) : (
          <div className="space-y-3">
            {tyres.map(record => (
              <div
                key={record.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900">
                      {record.tyre_brand || 'Unknown Brand'}
                      {record.tyre_size && ` - ${record.tyre_size}`}
                    </p>
                    <Badge
                      variant={record.status === 'active' ? 'success' : 'secondary'}
                      size="sm"
                    >
                      {record.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(new Date(record.purchase_date))}
                    </span>
                    <span>Qty: {record.quantity}</span>
                    {record.supplier && <span>Supplier: {record.supplier}</span>}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">
                    {formatCurrency(record.cost_per_tyre)} / tyre
                  </p>
                  <p className="text-lg font-bold text-purple-600">
                    {formatCurrency(record.total_cost)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Quick Actions */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link to={`/app/buses/${id}/vouchers/create`} className="block">
            <Button variant="secondary" className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Add Voucher
            </Button>
          </Link>
          <Link to={`/app/buses/${id}/vouchers`} className="block">
            <Button variant="secondary" className="w-full">
              <FileText className="mr-2 h-4 w-4" />
              View Vouchers
            </Button>
          </Link>
          <Link to={`/app/maintenance/new?bus_id=${id}`} className="block">
            <Button variant="secondary" className="w-full">
              <Wrench className="mr-2 h-4 w-4" />
              Add Maintenance
            </Button>
          </Link>
          <Link to={`/app/tyres/new?bus_id=${id}`} className="block">
            <Button variant="secondary" className="w-full">
              <Settings className="mr-2 h-4 w-4" />
              Add Tyre
            </Button>
          </Link>
        </div>
      </Card>

      {/* Edit Bus Modal */}
      {showEditModal && (
        <EditBusModal
          bus={bus}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false);
            fetchBusDetails();
          }}
        />
      )}
    </div>
  );
}

interface EditBusModalProps {
  bus: Bus;
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
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error: updateError } = await supabase
        .from('buses')
        .update({
          bus_name: busName || null,
          bus_type: busType || null,
          capacity: parseInt(capacity),
          status: status as any,
          updated_by: user?.id || null,
        })
        .eq('id', bus.id);

      if (updateError) throw updateError;

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
          onChange={(e) => setStatus(e.target.value as any)}
          options={[
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
            { value: 'maintenance', label: 'Maintenance' },
            { value: 'sold', label: 'Sold' },
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

