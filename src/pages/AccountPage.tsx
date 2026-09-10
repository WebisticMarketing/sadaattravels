import { useAuth } from '../hooks/useAuth';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { User, Mail, Phone, Shield, Calendar } from 'lucide-react';

export default function AccountPage() {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Account</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your account settings and security
        </p>
      </div>

      {/* Profile Information */}
      <Card>
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Profile Information</h2>
            <p className="text-sm text-gray-500">Your personal and account details</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Full Name */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <User className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-500">Full Name</p>
              <p className="text-base font-medium text-gray-900">
                {user.profile?.full_name || 'Not set'}
              </p>
            </div>
          </div>

          {/* Email */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
              <Mail className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-500">Email Address</p>
              <p className="text-base font-medium text-gray-900">{user.email}</p>
            </div>
          </div>

          {/* Phone */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
              <Phone className="h-5 w-5 text-purple-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-500">Phone Number</p>
              <p className="text-base font-medium text-gray-900">
                {user.profile?.phone || 'Not set'}
              </p>
            </div>
          </div>

          {/* Role */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
              <Shield className="h-5 w-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-500">Role</p>
              <div className="flex items-center gap-2 mt-1">
                {user.roles.map((role) => (
                  <Badge key={role} variant="primary" size="md">
                    {role}
                  </Badge>
                ))}
                {user.roles.length === 0 && (
                  <span className="text-sm text-gray-500">No role assigned</span>
                )}
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
              <Calendar className="h-5 w-5 text-gray-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-500">Account Status</p>
              <div className="mt-1">
                <Badge
                  variant={user.profile?.status === 'active' ? 'success' : 'secondary'}
                  size="md"
                >
                  {user.profile?.status || 'Unknown'}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Security Section */}
      <Card>
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Security</h2>
            <p className="text-sm text-gray-500">Manage your password and security settings</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Change Password */}
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <div>
              <h3 className="text-base font-medium text-gray-900">Change Password</h3>
              <p className="text-sm text-gray-500 mt-1">
                Update your password to keep your account secure
              </p>
            </div>
            <button
              onClick={() => window.location.href = '/account/security'}
              className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
            >
              Manage →
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
