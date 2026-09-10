import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { logError } from '../utils/errors';
import type { User, Role, Permission } from '../types/database';

export interface UserWithRoles extends User {
  roles: string[];
  roleIds: string[];
}

/**
 * Fetch all users with their roles
 */
export function useUsers() {
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      if (!usersData || usersData.length === 0) {
        setUsers([]);
        setLoading(false);
        return;
      }

      // Fetch user roles
      const userIds = usersData.map(u => u.id);
      const { data: userRolesData, error: userRolesError } = await supabase
        .from('user_roles')
        .select('user_id, role_id, roles(name)')
        .in('user_id', userIds);

      if (userRolesError) throw userRolesError;

      // Map roles to users
      const usersWithRoles: UserWithRoles[] = usersData.map(user => {
        const userRoles = userRolesData?.filter(ur => ur.user_id === user.id) || [];
        return {
          ...user,
          roles: userRoles.map(ur => (ur.roles as any)?.name || '').filter(Boolean),
          roleIds: userRoles.map(ur => ur.role_id),
        };
      });

      setUsers(usersWithRoles);
      setLoading(false);
    } catch (err) {
      logError(err, 'useUsers');
      setError(err instanceof Error ? err.message : 'Failed to load users');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return { users, loading, error, refetch: fetchUsers };
}

/**
 * Fetch all available roles
 */
export function useRoles() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRoles() {
      try {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from('roles')
          .select('*')
          .order('name', { ascending: true });

        if (fetchError) throw fetchError;

        setRoles(data || []);
        setLoading(false);
      } catch (err) {
        logError(err, 'useRoles');
        setError(err instanceof Error ? err.message : 'Failed to load roles');
        setLoading(false);
      }
    }

    fetchRoles();
  }, []);

  return { roles, loading, error };
}

/**
 * Fetch all permissions
 */
export function usePermissions() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPermissions() {
      try {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from('permissions')
          .select('*')
          .order('module', { ascending: true })
          .order('code', { ascending: true });

        if (fetchError) throw fetchError;

        setPermissions(data || []);
        setLoading(false);
      } catch (err) {
        logError(err, 'usePermissions');
        setError(err instanceof Error ? err.message : 'Failed to load permissions');
        setLoading(false);
      }
    }

    fetchPermissions();
  }, []);

  return { permissions, loading, error };
}

/**
 * Create a new user
 */
export async function createUser(data: {
  email: string;
  full_name: string;
  phone?: string;
  password: string;
}): Promise<User> {
  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
  });

  if (authError) throw authError;
  if (!authData.user) throw new Error('Failed to create user');

  // Create application user
  const { data: userData, error: userError } = await supabase
    .from('users')
    .insert({
      id: authData.user.id,
      email: data.email,
      full_name: data.full_name,
      phone: data.phone,
      status: 'active',
    })
    .select()
    .single();

  if (userError) throw userError;
  return userData;
}

/**
 * Update user details
 */
export async function updateUser(
  id: string,
  updates: Partial<Pick<User, 'full_name' | 'phone' | 'status'>>
): Promise<User> {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Assign role to user
 */
export async function assignRoleToUser(userId: string, roleId: string): Promise<void> {
  const { error } = await supabase
    .from('user_roles')
    .insert({
      user_id: userId,
      role_id: roleId,
    });

  if (error) throw error;
}

/**
 * Remove role from user
 */
export async function removeRoleFromUser(userId: string, roleId: string): Promise<void> {
  const { error } = await supabase
    .from('user_roles')
    .delete()
    .eq('user_id', userId)
    .eq('role_id', roleId);

  if (error) throw error;
}
