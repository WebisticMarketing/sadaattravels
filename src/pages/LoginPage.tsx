/**
 * Login page.
 *
 * Simple, professional login form using Supabase Auth.
 */

import { useState, FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Alert } from '../components/ui/Alert';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, error, clearError, loading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Get the page the user was trying to access before being redirected to login
  const from = (location.state as any)?.from?.pathname || '/app/dashboard';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();

    try {
      await login({ email, password });
      navigate(from, { replace: true });
    } catch (err) {
      // Error is handled by the hook
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-blue-600">
            <span className="text-2xl font-bold text-white">ST</span>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Sadaat Travels
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Management System
          </p>
        </div>

        {/* Login Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm space-y-4">
            <Input
              label="Email address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="danger" title="Login failed">
              {error.message}
            </Alert>
          )}

          <div>
            <Button
              type="submit"
              fullWidth
              loading={loading}
              disabled={!email || !password}
            >
              Sign in
            </Button>
          </div>
        </form>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500">
          <p>
            Contact your administrator if you need an account.
          </p>
        </div>
      </div>
    </div>
  );
}
