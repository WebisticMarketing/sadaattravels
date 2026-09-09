/**
 * Environment variable access layer.
 * All env vars are read through this module so the rest of the app
 * never calls import.meta.env directly.
 */

function required(key: string): string {
  const value = import.meta.env[key];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${key}. ` +
        `Check your .env file or environment configuration.`
    );
  }
  return value;
}

function optional(key: string, fallback: string): string {
  return import.meta.env[key] || fallback;
}

export const env = {
  /** Supabase project URL */
  supabaseUrl: required('VITE_SUPABASE_URL'),

  /** Supabase anonymous/public key */
  supabaseAnonKey: required('VITE_SUPABASE_ANON_KEY'),

  /** Application display name */
  appName: optional('VITE_APP_NAME', 'Sadaat Travels'),

  /** Current environment: development | production | test */
  appEnv: optional('VITE_APP_ENV', 'development'),

  /** Convenience flags */
  isDev: optional('VITE_APP_ENV', 'development') === 'development',
  isProd: optional('VITE_APP_ENV', 'development') === 'production',
} as const;

export type Env = typeof env;
