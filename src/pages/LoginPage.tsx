/**
 * Login page.
 *
 * Simple, professional login form using Supabase Auth.
 */

import { useState, useEffect, FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Alert } from '../components/ui/Alert';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, error, clearError, loading, needsBootstrap } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Get the page the user was trying to access before being redirected to login
  const from = (location.state as any)?.from?.pathname || '/app/dashboard';

  // If already authenticated and needs bootstrap, redirect
  useEffect(() => {
    if (needsBootstrap) {
      navigate('/bootstrap', { replace: true });
    }
  }, [needsBootstrap, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();

    try {
      await login({ email, password });
      // After login, check if bootstrap is needed
      if (needsBootstrap) {
        navigate('/bootstrap', { replace: true });
      } else {
        navigate(from, { replace: true });
      }
    } catch (err) {
      // Error is handled by the hook
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto mb-6">
            <img 
              src="/logo.png" 
              alt="Sadaat Travels" 
              className="h-20 w-auto mx-auto"
            />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Sadaat Travels
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Management System
          </p>
        </div>

        {/* Welcome Message */}
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">
            Welcome back
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to continue to your management system.
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
        <div className="text-center text-sm text-gray-500 space-y-4">
          <p>
            Contact your administrator if you need an account.
          </p>
          <p className="text-xs text-gray-400">
            © {new Date().getFullYear()} Sadaat Travels. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
