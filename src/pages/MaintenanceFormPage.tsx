import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useBuses } from '../hooks/useBuses';
import { createMaintenanceRecord, updateMaintenanceRecord, useBusMaintenance } from '../hooks/useMaintenance';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Alert } from '../components/ui/Alert';
import { formatDate } from '../lib/utils';
import { ArrowLeft } from 'lucide-react';

export default function MaintenanceFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { buses, loading: busesLoading } = useBuses();
  const { records: existingRecords } = useBusMaintenance(id || null);

  const isEdit = !!id;

  const [formData, setFormData] = useState({
    bus_id: '',
    maintenance_date: formatDate(new Date()),
    maintenance_type: '',
    description: '',
    cost: '',
    performed_by: '',
    next_maintenance_date: '',
    notes: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load existing record if editing
  useEffect(() => {
    if (isEdit && existingRecords.length > 0) {
      const record = existingRecords[0];
      setFormData({
        bus_id: record.bus_id,
        maintenance_date: formatDate(new Date(record.maintenance_date)),
        maintenance_type: record.maintenance_type,
        description: record.description,
        cost: record.cost.toString(),
        performed_by: record.performed_by || '',
        next_maintenance_date: record.next_maintenance_date ? formatDate(new Date(record.next_maintenance_date)) : '',
        notes: record.notes || '',
      });
    }
  }, [isEdit, existingRecords]);

  useEffect(() => {
    if (buses.length > 0 && !formData.bus_id && !isEdit) {
      setFormData({ ...formData, bus_id: buses[0].id });
    }
  }, [buses, formData, isEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!formData.bus_id) {
        throw new Error('Please select a bus');
      }
      if (!formData.maintenance_type.trim()) {
        throw new Error('Please enter maintenance type');
      }
      if (!formData.cost || parseFloat(formData.cost) <= 0) {
        throw new Error('Cost must be greater than 0');
      }

      // Convert dates from DD/MM/YYYY to YYYY-MM-DD for database
      const [day, month, year] = formData.maintenance_date.split('/');
      const isoDate = `${year}-${month}-${day}`;
      
      let nextMaintenanceIso: string | undefined;
      if (formData.next_maintenance_date) {
        const [nextDay, nextMonth, nextYear] = formData.next_maintenance_date.split('/');
        nextMaintenanceIso = `${nextYear}-${nextMonth}-${nextDay}`;
      }

      const data = {
        bus_id: formData.bus_id,
        maintenance_date: isoDate,
        maintenance_type: formData.maintenance_type.trim(),
        description: formData.description.trim(),
        cost: parseFloat(formData.cost),
        performed_by: formData.performed_by.trim() || undefined,
        next_maintenance_date: nextMaintenanceIso,
        notes: formData.notes.trim() || undefined,
      };

      if (isEdit) {
        await updateMaintenanceRecord(id!, data);
      } else {
        await createMaintenanceRecord(data);
      }

      navigate('/app/maintenance');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save maintenance record');
      setLoading(false);
    }
  };

  if (busesLoading) {
    return (
      <div className="p-4">
        <p className="text-gray-500">Loading buses...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
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
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Edit Maintenance Record' : 'New Maintenance Record'}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {isEdit ? 'Update maintenance details' : 'Record bus maintenance work'}
          </p>
        </div>
      </div>

      {/* Form */}
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Bus Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bus *
            </label>
            <select
              value={formData.bus_id}
              onChange={(e) => setFormData({ ...formData, bus_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              disabled={isEdit}
            >
              <option value="">Select a bus</option>
              {buses.map((bus) => (
                <option key={bus.id} value={bus.id}>
                  {bus.registration_number}
                  {bus.bus_name ? ` - ${bus.bus_name}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Maintenance Date */}
          <Input
            label="Maintenance Date *"
            type="text"
            value={formData.maintenance_date}
            onChange={(e) => setFormData({ ...formData, maintenance_date: e.target.value })}
            placeholder="DD/MM/YYYY"
            required
            hint="Format: DD/MM/YYYY"
          />

          {/* Maintenance Type */}
          <Input
            label="Maintenance Type *"
            type="text"
            value={formData.maintenance_type}
            onChange={(e) => setFormData({ ...formData, maintenance_type: e.target.value })}
            placeholder="e.g., Engine Oil Change, Brake Pad Replacement"
            required
          />

          {/* Cost */}
          <Input
            label="Cost (Rs.) *"
            type="number"
            value={formData.cost}
            onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
            placeholder="e.g., 5000"
            min="0"
            step="0.01"
            required
          />

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Describe the maintenance work performed"
            />
          </div>

          {/* Performed By */}
          <Input
            label="Performed By"
            type="text"
            value={formData.performed_by}
            onChange={(e) => setFormData({ ...formData, performed_by: e.target.value })}
            placeholder="e.g., Mechanic name or workshop"
          />

          {/* Next Maintenance Date */}
          <Input
            label="Next Maintenance Date"
            type="text"
            value={formData.next_maintenance_date}
            onChange={(e) => setFormData({ ...formData, next_maintenance_date: e.target.value })}
            placeholder="DD/MM/YYYY"
            hint="Optional: When should the next maintenance be scheduled?"
          />

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Additional notes or observations"
            />
          </div>

          {/* Error */}
          {error && (
            <Alert variant="danger" title="Error">
              {error}
            </Alert>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/app/maintenance')}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={loading}
              className="flex-1"
            >
              {isEdit ? 'Update Record' : 'Create Record'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
