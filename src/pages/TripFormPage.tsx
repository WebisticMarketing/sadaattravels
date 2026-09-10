import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBuses } from '../hooks/useBuses';
import { createTrip } from '../hooks/useTrips';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Alert } from '../components/ui/Alert';
import { formatDate } from '../lib/utils';
import { ArrowLeft } from 'lucide-react';

export default function TripFormPage() {
  const navigate = useNavigate();
  const { buses, loading: busesLoading } = useBuses();

  const [formData, setFormData] = useState({
    bus_id: '',
    trip_date: formatDate(new Date()),
    route: '',
    departure_time: '',
    arrival_time: '',
    notes: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (buses.length > 0 && !formData.bus_id) {
      setFormData({ ...formData, bus_id: buses[0].id });
    }
  }, [buses, formData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!formData.bus_id) {
        throw new Error('Please select a bus');
      }
      if (!formData.route.trim()) {
        throw new Error('Please enter a route');
      }

      // Convert date from DD/MM/YYYY to YYYY-MM-DD for database
      const [day, month, year] = formData.trip_date.split('/');
      const isoDate = `${year}-${month}-${day}`;

      const trip = await createTrip({
        bus_id: formData.bus_id,
        trip_date: isoDate,
        route: formData.route.trim(),
        departure_time: formData.departure_time || undefined,
        arrival_time: formData.arrival_time || undefined,
        notes: formData.notes.trim() || undefined,
      });

      navigate(`/app/trips/${trip.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create trip');
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
          onClick={() => navigate('/app/trips')}
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Trip</h1>
          <p className="mt-1 text-sm text-gray-500">
            Create a new trip and start recording revenue and expenses
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

          {/* Trip Date */}
          <Input
            label="Trip Date *"
            type="text"
            value={formData.trip_date}
            onChange={(e) => setFormData({ ...formData, trip_date: e.target.value })}
            placeholder="DD/MM/YYYY"
            required
            hint="Format: DD/MM/YYYY"
          />

          {/* Route */}
          <Input
            label="Route *"
            type="text"
            value={formData.route}
            onChange={(e) => setFormData({ ...formData, route: e.target.value })}
            placeholder="e.g., Lahore to Karachi"
            required
          />

          {/* Times */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Departure Time"
              type="time"
              value={formData.departure_time}
              onChange={(e) => setFormData({ ...formData, departure_time: e.target.value })}
            />
            <Input
              label="Arrival Time"
              type="time"
              value={formData.arrival_time}
              onChange={(e) => setFormData({ ...formData, arrival_time: e.target.value })}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Optional notes about this trip"
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
              onClick={() => navigate('/app/trips')}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={loading}
              className="flex-1"
            >
              Create Trip
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
