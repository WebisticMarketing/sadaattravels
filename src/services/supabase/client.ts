import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from '../../config/env';
import type { Database } from '../../types/database';

/**
 * Supabase client instance.
 *
 * This is the single shared client used throughout the application.
 * Authentication, database queries, and storage all go through this client.
 *
 * The client is typed with our Database schema for type-safe queries.
 *
 * NOTE: Row-Level Security (RLS) must be configured on the Supabase side.
 * The frontend client uses the anon key; all data access policies are
 * enforced server-side by Supabase/PostgreSQL.
 */

let _client: SupabaseClient<Database> | null = null;

export function getSupabaseClient(): SupabaseClient<Database> {
  if (!_client) {
    _client = createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    });
  }
  return _client;
}

/**
 * Convenience re-export so consumers can write:
 *   import { supabase } from '@/services/supabase';
 */
export const supabase = getSupabaseClient();
