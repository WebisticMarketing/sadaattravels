/**
 * Login page.
 *
 * Professional single-card login form using Supabase Auth.
 */

import { useState, FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Alert } from '../components/ui/Alert';
import { Eye, EyeOff, Shield } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, error, clearError, loading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

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
    <div className="w-full max-w-md">
      {/* Single Login Card */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
        {/* Logo and Branding */}
        <div className="text-center mb-6">
          <img 
            src="/logo.png" 
            alt="Sadaat Travels" 
            className="h-16 w-auto mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            Sadaat Travels
          </h1>
          <p className="text-sm text-gray-600">
            Management System
          </p>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 my-6"></div>

        {/* Welcome Message */}
        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Welcome back
          </h2>
          <p className="text-sm text-gray-600">
            Sign in to access your account
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email Input */}
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoComplete="email"
          />

          {/* Password Input with Show/Hide Toggle */}
          <div className="relative">
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              autoComplete="current-password"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-9 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>

          {/* Forgot Password Link */}
          <div className="text-right">
            <a
              href="/forgot-password"
              className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
            >
              Forgot password?
            </a>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="danger" title="Login failed">
              {error.message}
            </Alert>
          )}

          {/* Sign In Button */}
          <Button
            type="submit"
            fullWidth
            loading={loading}
            disabled={!email || !password}
            className="mt-6"
          >
            Sign In
          </Button>
        </form>

        {/* Security Text */}
        <div className="mt-6 pt-6 border-t border-gray-100">
          <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
            <Shield className="h-3.5 w-3.5" />
            <span>Secure Management Portal</span>
          </div>
        </div>
      </div>

      {/* Footer - Outside the card */}
      <div className="text-center mt-6 space-y-2">
        <p className="text-sm text-gray-600">
          Contact your administrator if you need an account.
        </p>
        <p className="text-xs text-gray-400">
          © {new Date().getFullYear()} Sadaat Travels. All rights reserved.
        </p>
      </div>
    </div>
  );
}
