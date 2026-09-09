import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Alert } from '../components/ui/Alert';

/**
 * Login page — placeholder.
 * Real authentication will be implemented in a later phase.
 * For now this just navigates to the app shell.
 */
export default function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Placeholder: real auth will be added later
    // For now, any non-empty credentials navigate to the app
    await new Promise((r) => setTimeout(r, 800));

    if (!username || !password) {
      setError('Please enter your credentials.');
      setLoading(false);
      return;
    }

    setLoading(false);
    navigate('/app/dashboard');
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-1">Sign In</h2>
      <p className="text-sm text-gray-500 mb-6">Enter your credentials to access the system.</p>

      {error && (
        <Alert variant="danger" className="mb-4">
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Username"
          type="text"
          placeholder="Enter your username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
        />
        <Input
          label="Password"
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
        <Button type="submit" fullWidth loading={loading}>
          Sign In
        </Button>
      </form>
    </div>
  );
}
