import { supabase } from '@/integrations/supabase/client';

const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;

// Helper for employee proxy calls
export async function employeeQuery(
  employeeId: string, ownerId: string, table: string, operation: string,
  data?: any, filters?: any, columns?: string
) {
  const res = await fetch(`https://${PROJECT_ID}.supabase.co/functions/v1/employee-data-proxy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ employeeId, ownerId, table, operation, data, filters, columns }),
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.error || 'Request failed');
  return result.data;
}

// Generic CRUD for owner (direct Supabase with RLS)
export async function fetchAll(table: string, userId: string, additionalFilters?: Record<string, any>) {
  let query = (supabase as any).from(table).select('*').eq('user_id', userId);
  if (additionalFilters) {
    for (const [key, value] of Object.entries(additionalFilters)) {
      query = query.eq(key, value);
    }
  }
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function insertRow(table: string, row: any) {
  const { data, error } = await (supabase as any).from(table).insert(row).select().single();
  if (error) throw error;
  return data;
}

export async function insertRows(table: string, rows: any[]) {
  const { data, error } = await (supabase as any).from(table).insert(rows).select();
  if (error) throw error;
  return data;
}

export async function updateRow(table: string, id: string, updates: any) {
  const { data, error } = await (supabase as any).from(table).update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteRow(table: string, id: string) {
  const { error } = await (supabase as any).from(table).delete().eq('id', id);
  if (error) throw error;
}

export async function getNextSequence(userId: string, counterType: string) {
  const now = new Date();
  const fy = now.getMonth() >= 3
    ? `${now.getFullYear().toString().slice(-2)}${(now.getFullYear() + 1).toString().slice(-2)}`
    : `${(now.getFullYear() - 1).toString().slice(-2)}${now.getFullYear().toString().slice(-2)}`;

  const { data, error } = await supabase.rpc('get_next_sequence', {
    p_user_id: userId,
    p_type: counterType,
    p_fy: fy,
  });
  if (error) throw error;
  return { value: data as number, fy };
}

// Fetch profile and owner_profile
export async function fetchProfile(userId: string) {
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
  return data;
}

export async function fetchOwnerProfile(userId: string) {
  const { data } = await supabase.from('owner_profiles').select('*').eq('id', userId).single();
  return data;
}

export async function updateOwnerProfile(userId: string, updates: any) {
  const { data, error } = await supabase.from('owner_profiles').update(updates).eq('id', userId).select().single();
  if (error) throw error;
  return data;
}

// Admin functions
export async function fetchAdminStats(token: string) {
  const res = await fetch(`https://${PROJECT_ID}.supabase.co/functions/v1/get-admin-stats`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error('Failed to fetch admin stats');
  return res.json();
}

export async function createOwnerViaAdmin(token: string, ownerData: any) {
  const res = await fetch(`https://${PROJECT_ID}.supabase.co/functions/v1/create-owner`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(ownerData),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to create owner');
  return data;
}
