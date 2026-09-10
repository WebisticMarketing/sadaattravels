/**
 * Bootstrap page for first OWNER account setup.
 * 
 * This page is shown when an authenticated user has no application profile.
 * It guides the user through creating the first OWNER account.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Alert } from '../components/ui/Alert';
import { Card, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';

export default function BootstrapPage() {
  const navigate = useNavigate();
  const { user, needsBootstrap, bootstrapFirstOwner, checkOwnerExists } = useAuth();
  
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ownerExists, setOwnerExists] = useState<boolean | null>(null);
  const [success, setSuccess] = useState(false);

  // Check if bootstrap is needed and if OWNER exists
  useEffect(() => {
    if (!needsBootstrap) {
      navigate('/app/dashboard', { replace: true });
      return;
    }

    checkOwnerExists().then(setOwnerExists);
  }, [needsBootstrap, checkOwnerExists, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await bootstrapFirstOwner(fullName, phone || undefined);
      setSuccess(true);
      
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        navigate('/app/dashboard', { replace: true });
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bootstrap failed');
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (ownerExists === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking system status...</p>
        </div>
      </div>
    );
  }

  // OWNER already exists - this shouldn't happen if needsBootstrap is true
  if (ownerExists) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Setup Already Complete</CardTitle>
            <CardDescription>
              An OWNER account already exists. Please contact your system administrator.
            </CardDescription>
          </CardHeader>
          <div className="mt-6">
            <Button onClick={() => navigate('/app/dashboard')} fullWidth>
              Go to Dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-green-600">✓ Bootstrap Successful</CardTitle>
            <CardDescription>
              Your OWNER account has been created. Redirecting to dashboard...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Bootstrap form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-blue-600">
            <span className="text-2xl font-bold text-white">ST</span>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            First-Time Setup
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Welcome to Sadaat Travels Management System
          </p>
        </div>

        {/* Info Card */}
        <Alert variant="info" title="System Bootstrap Required">
          <p className="text-sm">
            You are authenticated as <strong>{user?.email}</strong>, but no application profile exists.
            This appears to be the first time the system is being set up.
          </p>
          <p className="text-sm mt-2">
            Complete the form below to create the first OWNER account.
          </p>
        </Alert>

        {/* Bootstrap Form */}
        <Card>
          <CardHeader>
            <CardTitle>Create First OWNER Account</CardTitle>
            <CardDescription>
              This will create your application profile and assign OWNER role.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="Full Name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
              required
              disabled={loading}
            />

            <Input
              label="Phone Number (Optional)"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+92 300 1234567"
              disabled={loading}
            />

            {error && (
              <Alert variant="danger" title="Bootstrap Failed">
                {error}
              </Alert>
            )}

            <div className="space-y-3">
              <Button
                type="submit"
                fullWidth
                loading={loading}
                disabled={!fullName || loading}
              >
                Create OWNER Account
              </Button>

              <Button
                type="button"
                variant="secondary"
                fullWidth
                onClick={() => navigate('/login')}
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>

        {/* Manual Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Manual Bootstrap (Alternative)</CardTitle>
            <CardDescription>
              If the automated bootstrap fails, you can manually create the OWNER account using SQL.
            </CardDescription>
          </CardHeader>

          <div className="space-y-4 text-sm">
            <div>
              <p className="font-semibold text-gray-900 mb-2">Step 1: Login to Supabase Dashboard</p>
              <p className="text-gray-600">
                Go to your Supabase project → SQL Editor
              </p>
            </div>

            <div>
              <p className="font-semibold text-gray-900 mb-2">Step 2: Run SQL as Authenticated User</p>
              <p className="text-gray-600 mb-2">
                The bootstrap function will automatically use your authenticated user ID and email.
              </p>
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-xs">
{`-- The function derives your user ID and email from auth.uid()
SELECT public.bootstrap_first_owner(
  'Your Full Name',
  '+92 300 1234567'  -- or NULL
);`}
              </pre>
            </div>

            <div>
              <p className="font-semibold text-gray-900 mb-2">Step 3: Verify</p>
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-xs">
{`-- Check that OWNER was created
SELECT u.email, u.full_name, r.name as role
FROM public.users u
JOIN public.user_roles ur ON ur.user_id = u.id
JOIN public.roles r ON r.id = ur.role_id
WHERE r.name = 'OWNER';`}
              </pre>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
