import { supabase } from '@/integrations/supabase/client';

export interface OwnerSession {
  type: 'owner';
  userId: string;
  email: string;
  profile: any;
  ownerProfile: any;
}

export interface EmployeeSession {
  type: 'employee';
  employeeId: string;
  ownerId: string;
  name: string;
  permissions: any;
  ownerFirmName: string;
  ownerPlan: string;
  ownerSubEnd: string | null;
}

export interface AdminSession {
  type: 'super_admin';
  userId: string;
  email: string;
}

export type AppSessionData = OwnerSession | EmployeeSession | AdminSession | null;

export async function loginOwner(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { success: false, error: error.message };

  const userId = data.user.id;

  // Fetch profile
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (!profile) return { success: false, error: 'Profile not found' };

  if (profile.role === 'super_admin') {
    return { success: true, session: { type: 'super_admin' as const, userId, email: data.user.email! } };
  }

  if (profile.role !== 'owner') return { success: false, error: 'Invalid account type' };

  // Fetch owner profile
  const { data: ownerProfile } = await supabase.from('owner_profiles').select('*').eq('id', userId).single();
  if (!ownerProfile) return { success: false, error: 'Business profile not found' };

  if (!ownerProfile.active) return { success: false, error: 'Aapka account block hai! Admin se sampark karein.' };

  if (ownerProfile.sub_end) {
    const subEnd = new Date(ownerProfile.sub_end);
    const now = new Date();
    const daysLeft = Math.ceil((subEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysLeft < 0) return { success: false, error: 'Aapki subscription khatam ho gayi!' };

    return {
      success: true,
      warning: daysLeft <= 7 ? `Subscription ${daysLeft} din mein khatam hogi!` : undefined,
      session: { type: 'owner' as const, userId, email: data.user.email!, profile, ownerProfile },
    };
  }

  return {
    success: true,
    session: { type: 'owner' as const, userId, email: data.user.email!, profile, ownerProfile },
  };
}

export async function loginEmployee(username: string, password: string) {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const res = await fetch(`https://${projectId}.supabase.co/functions/v1/employee-auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  const data = await res.json();

  if (!res.ok) {
    const messages: Record<string, string> = {
      INVALID_CREDENTIALS: 'Username ya password galat hai!',
      INACTIVE_ACCOUNT: 'Aapka account block hai!',
      OWNER_BLOCKED: 'Owner ka account block hai!',
      SUBSCRIPTION_EXPIRED: 'Owner ki subscription khatam ho gayi!',
      OWNER_NOT_FOUND: 'Owner account not found',
    };
    return { success: false, error: messages[data.code] || data.error || 'Login failed' };
  }

  return {
    success: true,
    session: {
      type: 'employee' as const,
      employeeId: data.employee.id,
      ownerId: data.employee.owner_id,
      name: data.employee.name,
      permissions: data.employee.permissions,
      ownerFirmName: data.owner.firm_name,
      ownerPlan: data.owner.plan,
      ownerSubEnd: data.owner.sub_end,
    },
    sessionToken: data.sessionToken,
  };
}

export async function logoutOwner() {
  await supabase.auth.signOut();
}

export async function getCurrentSupabaseSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}
