import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUsers, useRoles, updateUser, assignRoleToUser, removeRoleFromUser } from '../hooks/useUsers';
import { Badge } from '../components/ui/Badge';
import { formatDate } from '../lib/utils';
import { ArrowLeft } from 'lucide-react';

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { users, loading, error, refetch } = useUsers();
  const { roles } = useRoles();

  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    status: 'active',
  });

  const user = users.find(u => u.id === id);

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name,
        phone: user.phone || '',
        status: user.status,
      });
    }
  }, [user]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      await updateUser(user.id, {
        full_name: formData.full_name,
        phone: formData.phone || undefined,
        status: formData.status as any,
      });
      setEditing(false);
      refetch();
    } catch (err) {
      console.error('Failed to update user:', err);
    }
  };

  const handleAssignRole = async (roleId: string) => {
    if (!user) return;

    try {
      await assignRoleToUser(user.id, roleId);
      refetch();
    } catch (err) {
      console.error('Failed to assign role:', err);
    }
  };

  const handleRemoveRole = async (roleId: string) => {
    if (!user) return;

    try {
      await removeRoleFromUser(user.id, roleId);
      refetch();
    } catch (err) {
      console.error('Failed to remove role:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <p className="mt-2 text-sm text-gray-500">Loading user...</p>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/app/users')}
            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{error || 'User not found'}</p>
        </div>
      </div>
    );
  }

  const availableRoles = roles.filter(role => !user.roleIds.includes(role.id));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/app/users')}
            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{user.full_name}</h1>
            <p className="mt-1 text-sm text-gray-500">{user.email}</p>
          </div>
        </div>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Edit User
          </button>
        )}
      </div>

      {/* User Details */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">User Details</h2>
        {editing ? (
          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Full Name
              </label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Save Changes
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="text-base text-gray-900">{user.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Phone</p>
              <p className="text-base text-gray-900">{user.phone || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <Badge
                variant={user.status === 'active' ? 'success' : 'secondary'}
                size="sm"
              >
                {user.status}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-gray-500">Created</p>
              <p className="text-base text-gray-900">
                {formatDate(new Date(user.created_at))}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Roles */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Roles</h2>
        
        {/* Current Roles */}
        <div className="mb-4">
          <p className="mb-2 text-sm font-medium text-gray-700">Current Roles</p>
          {user.roles.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {user.roles.map((role, idx) => (
                <div key={idx} className="flex items-center gap-1">
                  <Badge variant="primary" size="md">
                    {role}
                  </Badge>
                  <button
                    onClick={() => handleRemoveRole(user.roleIds[idx])}
                    className="text-xs text-red-600 hover:text-red-900"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No roles assigned</p>
          )}
        </div>

        {/* Available Roles */}
        {availableRoles.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-medium text-gray-700">Available Roles</p>
            <div className="flex flex-wrap gap-2">
              {availableRoles.map((role) => (
                <button
                  key={role.id}
                  onClick={() => handleAssignRole(role.id)}
                  className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-1 text-sm text-blue-700 hover:bg-blue-100"
                >
                  + {role.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
